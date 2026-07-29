package file

import (
	"encoding/json"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
	"github.com/zeromicro/go-zero/rest/httpx"
	"github.com/zeromicro/go-zero/rest/pathvar"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) upload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(maxFileSize + 1); err != nil {
		h.writeError(r, w, response.Business(400, "文件不能为空"))
		return
	}
	headers := r.MultipartForm.File["file"]
	if len(headers) == 0 {
		h.writeError(r, w, response.Business(400, "文件不能为空"))
		return
	}
	options := uploadOptions(r)
	record, err := h.service.Upload(r.Context(), headers[0], options)
	h.writeResult(r, w, record, err)
}

func (h *Handler) uploadBatch(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(maxFileSize + 1); err != nil {
		h.writeError(r, w, response.Business(400, "文件不能为空"))
		return
	}
	result := h.service.UploadBatch(r.Context(), r.MultipartForm.File["files"], uploadOptions(r))
	h.writeResult(r, w, result, nil)
}

func (h *Handler) page(w http.ResponseWriter, r *http.Request) {
	query, err := parsePageQuery(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.Page(r.Context(), query)
	h.writeResult(r, w, result, err)
}

func (h *Handler) detail(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	result, err := h.service.Detail(r.Context(), id)
	h.writeResult(r, w, result, err)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	var request FileUpdateRequest
	if err := decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	err = h.service.Update(r.Context(), id, &request)
	h.writeResult(r, w, nil, err)
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	err = h.service.Delete(r.Context(), id)
	h.writeResult(r, w, nil, err)
}

func (h *Handler) batchDelete(w http.ResponseWriter, r *http.Request) {
	var request IDsRequest
	if err := decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	err := h.service.BatchDelete(r.Context(), request.IDs)
	h.writeResult(r, w, nil, err)
}

func (h *Handler) updateStatus(w http.ResponseWriter, r *http.Request) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	var request FileStatusRequest
	if err := decodeJSON(r, &request); err != nil {
		h.writeError(r, w, err)
		return
	}
	err = h.service.UpdateStatus(r.Context(), id, request.Status)
	h.writeResult(r, w, nil, err)
}

func (h *Handler) download(w http.ResponseWriter, r *http.Request) {
	h.serveResource(w, r, true)
}

func (h *Handler) view(w http.ResponseWriter, r *http.Request) {
	h.serveResource(w, r, false)
}

func (h *Handler) serveResource(w http.ResponseWriter, r *http.Request, download bool) {
	id, err := pathID(r)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	resource, err := h.service.Resource(r.Context(), id)
	if err != nil {
		h.writeError(r, w, err)
		return
	}
	file, err := os.Open(resource.Path)
	if err != nil {
		h.writeError(r, w, response.Business(404, "数据不存在"))
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil || info.IsDir() {
		h.writeError(r, w, response.Business(404, "数据不存在"))
		return
	}
	contentType := resource.MimeType
	if !download {
		if parsed, _, parseErr := mime.ParseMediaType(contentType); parseErr == nil {
			contentType = parsed
		}
		if contentType == "" {
			contentType = mime.TypeByExtension(strings.ToLower(extension(resource.OriginalName)))
		}
	}
	if contentType == "" || download {
		contentType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", contentDisposition(resource.OriginalName, download))
	http.ServeContent(w, r, resource.OriginalName, info.ModTime(), file)
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

func decodeJSON(r *http.Request, target any) error {
	if r.Body == nil {
		return response.Validation(map[string]string{"body": "请求参数不能为空"})
	}
	if err := json.NewDecoder(r.Body).Decode(target); err != nil {
		return response.Validation(map[string]string{"body": "请求参数格式错误"})
	}
	return nil
}

func pathID(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(strings.TrimSpace(pathvar.Vars(r)["id"]), 10, 64)
	if err != nil || id <= 0 {
		return 0, response.Validation(map[string]string{"id": "ID 必须是正整数"})
	}
	return id, nil
}

func uploadOptions(r *http.Request) FileUploadOptions {
	return FileUploadOptions{
		BusinessModule: firstMultipartValue(r, "businessModule"),
		Remark:         firstMultipartValue(r, "remark"),
	}
}

func firstMultipartValue(r *http.Request, key string) string {
	values := r.MultipartForm.Value[key]
	if len(values) == 0 {
		return ""
	}
	return strings.TrimSpace(values[0])
}

func parsePageQuery(r *http.Request) (FilePageQuery, error) {
	fields := make(map[string]string)
	page := parseIntQuery(r, "page", defaultPage, fields)
	pageSize := parseIntQuery(r, "pageSize", defaultPageSize, fields)
	if page < 1 {
		fields["page"] = "页码不能小于 1"
	}
	if pageSize < 1 || pageSize > maxPageSize {
		fields["pageSize"] = "每页条数必须在 1 到 500 之间"
	}
	query := FilePageQuery{Page: page, PageSize: pageSize,
		OriginalName:   strings.TrimSpace(r.URL.Query().Get("originalName")),
		BusinessModule: strings.TrimSpace(r.URL.Query().Get("businessModule")),
		MimeType:       strings.TrimSpace(r.URL.Query().Get("mimeType"))}
	if status := strings.TrimSpace(r.URL.Query().Get("status")); status != "" && status != "all" {
		value, err := strconv.ParseInt(status, 10, 64)
		if err != nil || (value != 0 && value != 1) {
			fields["status"] = "状态只能为 0 或 1"
		} else {
			query.Status = &value
		}
	}
	if len(fields) > 0 {
		return query, response.Validation(fields)
	}
	return query, nil
}

func parseIntQuery(r *http.Request, key string, fallback int64, fields map[string]string) int64 {
	raw := strings.TrimSpace(r.URL.Query().Get(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		fields[key] = "必须是有效数字"
		return fallback
	}
	return value
}

func contentDisposition(name string, download bool) string {
	filename := url.QueryEscape(name)
	filename = strings.ReplaceAll(filename, "+", "%20")
	prefix := "inline"
	if download {
		prefix = "attachment"
	}
	return prefix + "; filename*=UTF-8''" + filename
}

func extension(name string) string {
	return filepath.Ext(name)
}
