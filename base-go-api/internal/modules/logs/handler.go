package logs

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/svc"
	"github.com/zeromicro/go-zero/rest/httpx"
	"github.com/zeromicro/go-zero/rest/pathvar"
)

type Handler struct {
	service *Service
}

func NewHandler(ctx *svc.ServiceContext) *Handler {
	return &Handler{service: NewService(ctx.DB, ctx.Config.LogClearEnabled)}
}

func (h *Handler) loginLogPage(w http.ResponseWriter, r *http.Request) {
	query, err := parseLoginLogPageQuery(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.LoginLogPage(r.Context(), query)
	h.writeResult(r, w, result, err)
}

func (h *Handler) loginLogDetail(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.LoginLogDetail(r.Context(), id)
	h.writeResult(r, w, result, err)
}

func (h *Handler) clearLoginLogs(w http.ResponseWriter, r *http.Request) {
	h.writeResult(r, w, nil, h.service.ClearLoginLogs(r.Context()))
}

func (h *Handler) batchDeleteLoginLogs(w http.ResponseWriter, r *http.Request) {
	var request IDsRequest
	if err := decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	h.writeResult(r, w, nil, h.service.BatchDeleteLoginLogs(r.Context(), request.IDs))
}

func (h *Handler) operLogPage(w http.ResponseWriter, r *http.Request) {
	query, err := parseOperLogPageQuery(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.OperLogPage(r.Context(), query)
	h.writeResult(r, w, result, err)
}

func (h *Handler) operLogDetail(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.OperLogDetail(r.Context(), id)
	h.writeResult(r, w, result, err)
}

func (h *Handler) clearOperLogs(w http.ResponseWriter, r *http.Request) {
	h.writeResult(r, w, nil, h.service.ClearOperLogs(r.Context()))
}

func (h *Handler) batchDeleteOperLogs(w http.ResponseWriter, r *http.Request) {
	var request IDsRequest
	if err := decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	h.writeResult(r, w, nil, h.service.BatchDeleteOperLogs(r.Context(), request.IDs))
}

func (h *Handler) writeResult(r *http.Request, w http.ResponseWriter, result any, err error) {
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	httpx.OkJsonCtx(r.Context(), w, result)
}

func (h *Handler) writeError(r *http.Request, w http.ResponseWriter, err error) {
	httpx.ErrorCtx(r.Context(), w, err)
}

func decodeJSON(r *http.Request, value any) error {
	if r.Body == nil {
		return response.Validation(map[string]string{"body": "请求参数不能为空"})
	}
	if err := json.NewDecoder(r.Body).Decode(value); err != nil {
		return response.Validation(map[string]string{"body": "请求参数格式错误"})
	}
	return nil
}

func pathID(r *http.Request) (int64, error) {
	value := strings.TrimSpace(pathvar.Vars(r)["id"])
	id, err := strconv.ParseInt(value, 10, 64)
	if err != nil || id <= 0 {
		return 0, response.Validation(map[string]string{"id": "ID 必须是正整数"})
	}
	return id, nil
}

func parseLoginLogPageQuery(r *http.Request) (LoginLogPageQuery, error) {
	page, pageSize, fields := parsePage(r)
	return LoginLogPageQuery{
		Page:        page,
		PageSize:    pageSize,
		Username:    strings.TrimSpace(r.URL.Query().Get("username")),
		LoginStatus: strings.TrimSpace(r.URL.Query().Get("loginStatus")),
		LoginIP:     strings.TrimSpace(r.URL.Query().Get("loginIp")),
	}, validationFromFields(fields)
}

func parseOperLogPageQuery(r *http.Request) (OperLogPageQuery, error) {
	page, pageSize, fields := parsePage(r)
	return OperLogPageQuery{
		Page:            page,
		PageSize:        pageSize,
		ModuleName:      strings.TrimSpace(r.URL.Query().Get("moduleName")),
		OperationType:   strings.TrimSpace(r.URL.Query().Get("operationType")),
		OperatorName:    strings.TrimSpace(r.URL.Query().Get("operatorName")),
		OperationStatus: strings.TrimSpace(r.URL.Query().Get("operationStatus")),
	}, validationFromFields(fields)
}

func parsePage(r *http.Request) (int64, int64, map[string]string) {
	fields := make(map[string]string)
	page := parseQueryInt(r, "page", defaultPage, fields)
	pageSize := parseQueryInt(r, "pageSize", defaultPageSize, fields)
	if page < 1 {
		fields["page"] = "页码不能小于 1"
	}
	if pageSize < 1 {
		fields["pageSize"] = "每页条数不能小于 1"
	} else if pageSize > maxPageSize {
		fields["pageSize"] = "每页条数不能超过 500"
	}
	return page, pageSize, fields
}

func parseQueryInt(r *http.Request, key string, fallback int64, fields map[string]string) int64 {
	value := strings.TrimSpace(r.URL.Query().Get(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		fields[key] = "必须是有效数字"
		return fallback
	}
	return parsed
}

func validationFromFields(fields map[string]string) error {
	if len(fields) == 0 {
		return nil
	}
	return response.Validation(fields)
}
