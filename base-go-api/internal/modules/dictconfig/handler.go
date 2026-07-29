package dictconfig

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
	return &Handler{service: NewService(ctx.DB)}
}

func (h *Handler) dictTypePage(w http.ResponseWriter, r *http.Request) {
	query, err := parseDictTypePageQuery(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.DictTypePage(r.Context(), query)
	h.writeResult(r, w, result, err)
}

func (h *Handler) dictTypeDetail(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.DictTypeDetail(r.Context(), id)
	h.writeResult(r, w, result, err)
}

func (h *Handler) createDictType(w http.ResponseWriter, r *http.Request) {
	var request DictTypeSaveRequest
	if err := decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.CreateDictType(r.Context(), &request)
	h.writeResult(r, w, result, err)
}

func (h *Handler) updateDictType(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	var request DictTypeSaveRequest
	if err = decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.UpdateDictType(r.Context(), id, &request)
	h.writeResult(r, w, result, err)
}

func (h *Handler) deleteDictType(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	err = h.service.DeleteDictType(r.Context(), id)
	h.writeResult(r, w, nil, err)
}

func (h *Handler) batchDeleteDictTypes(w http.ResponseWriter, r *http.Request) {
	var request IDsRequest
	if err := decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	err := h.service.BatchDeleteDictTypes(r.Context(), request.IDs)
	h.writeResult(r, w, nil, err)
}

func (h *Handler) updateDictTypeStatus(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	var request StatusRequest
	if err = decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	err = h.service.UpdateDictTypeStatus(r.Context(), id, request.Status)
	h.writeResult(r, w, nil, err)
}

func (h *Handler) dictDataPage(w http.ResponseWriter, r *http.Request) {
	query, err := parseDictDataPageQuery(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.DictDataPage(r.Context(), query)
	h.writeResult(r, w, result, err)
}

func (h *Handler) dictDataDetail(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.DictDataDetail(r.Context(), id)
	h.writeResult(r, w, result, err)
}

func (h *Handler) createDictData(w http.ResponseWriter, r *http.Request) {
	var request DictDataSaveRequest
	if err := decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.CreateDictData(r.Context(), &request)
	h.writeResult(r, w, result, err)
}

func (h *Handler) updateDictData(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	var request DictDataSaveRequest
	if err = decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.UpdateDictData(r.Context(), id, &request)
	h.writeResult(r, w, result, err)
}

func (h *Handler) deleteDictData(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	err = h.service.DeleteDictData(r.Context(), id)
	h.writeResult(r, w, nil, err)
}

func (h *Handler) batchDeleteDictData(w http.ResponseWriter, r *http.Request) {
	var request IDsRequest
	if err := decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	err := h.service.BatchDeleteDictData(r.Context(), request.IDs)
	h.writeResult(r, w, nil, err)
}

func (h *Handler) dictItems(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimSpace(pathvar.Vars(r)["dictCode"])
	if code == "" {
		h.writeError(r, w, response.Validation(map[string]string{"dictCode": "字典编码不能为空"}))
		return
	}
	result, err := h.service.DictItems(r.Context(), code)
	h.writeResult(r, w, result, err)
}

func (h *Handler) configPage(w http.ResponseWriter, r *http.Request) {
	query, err := parseConfigPageQuery(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.ConfigPage(r.Context(), query)
	h.writeResult(r, w, result, err)
}

func (h *Handler) configDetail(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.ConfigDetail(r.Context(), id)
	h.writeResult(r, w, result, err)
}

func (h *Handler) configByKey(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimSpace(pathvar.Vars(r)["configKey"])
	if key == "" {
		h.writeError(r, w, response.Validation(map[string]string{"configKey": "配置键不能为空"}))
		return
	}
	result, err := h.service.ConfigByKey(r.Context(), key)
	h.writeResult(r, w, result, err)
}

func (h *Handler) createConfig(w http.ResponseWriter, r *http.Request) {
	var request ConfigSaveRequest
	if err := decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.CreateConfig(r.Context(), &request)
	h.writeResult(r, w, result, err)
}

func (h *Handler) updateConfig(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	var request ConfigSaveRequest
	if err = decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.UpdateConfig(r.Context(), id, &request)
	h.writeResult(r, w, result, err)
}

func (h *Handler) deleteConfig(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	err = h.service.DeleteConfig(r.Context(), id)
	h.writeResult(r, w, nil, err)
}

func (h *Handler) batchDeleteConfigs(w http.ResponseWriter, r *http.Request) {
	var request IDsRequest
	if err := decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	err := h.service.BatchDeleteConfigs(r.Context(), request.IDs)
	h.writeResult(r, w, nil, err)
}

func (h *Handler) updateConfigStatus(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	var request StatusRequest
	if err = decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	err = h.service.UpdateConfigStatus(r.Context(), id, request.Status)
	h.writeResult(r, w, nil, err)
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

func parseDictTypePageQuery(r *http.Request) (DictTypePageQuery, error) {
	page, pageSize, fields := parsePage(r)
	query := DictTypePageQuery{Page: page, PageSize: pageSize, DictName: strings.TrimSpace(r.URL.Query().Get("dictName")), DictCode: strings.TrimSpace(r.URL.Query().Get("dictCode"))}
	status, err := optionalStatus(r.URL.Query().Get("status"), "status", fields)
	query.Status = status
	if err != nil {
		return query, err
	}
	return query, validationFromFields(fields)
}

func parseDictDataPageQuery(r *http.Request) (DictDataPageQuery, error) {
	page, pageSize, fields := parsePage(r)
	query := DictDataPageQuery{Page: page, PageSize: pageSize, DictLabel: strings.TrimSpace(r.URL.Query().Get("dictLabel")), DictValue: strings.TrimSpace(r.URL.Query().Get("dictValue")), DictCode: strings.TrimSpace(r.URL.Query().Get("dictCode"))}
	if value := strings.TrimSpace(r.URL.Query().Get("dictTypeId")); value != "" {
		id, err := strconv.ParseInt(value, 10, 64)
		if err != nil || id <= 0 {
			fields["dictTypeId"] = "字典类型必须是正整数"
		} else {
			query.DictTypeID = &id
		}
	}
	return query, validationFromFields(fields)
}

func parseConfigPageQuery(r *http.Request) (ConfigPageQuery, error) {
	page, pageSize, fields := parsePage(r)
	query := ConfigPageQuery{Page: page, PageSize: pageSize, ConfigName: strings.TrimSpace(r.URL.Query().Get("configName")), ConfigKey: strings.TrimSpace(r.URL.Query().Get("configKey")), ConfigType: strings.TrimSpace(r.URL.Query().Get("configType"))}
	status, err := optionalStatus(r.URL.Query().Get("status"), "status", fields)
	query.Status = status
	if err != nil {
		return query, err
	}
	return query, validationFromFields(fields)
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

func optionalStatus(value, field string, fields map[string]string) (*int64, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	status, err := strconv.ParseInt(value, 10, 64)
	if err != nil || (status != 0 && status != 1) {
		fields[field] = "状态只能为 0 或 1"
		return nil, response.Validation(fields)
	}
	return &status, nil
}

func validationFromFields(fields map[string]string) error {
	if len(fields) == 0 {
		return nil
	}
	return response.Validation(fields)
}
