package filemgmt

import (
	"context"
	"errors"
	"mime"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/auth"
	platformhttp "github.com/EziosWJ/base-project-golang/base-go-api/internal/platform/http"
)

// HandlerService is the file-management use-case boundary consumed by HTTP.
type HandlerService interface {
	Upload(context.Context, AuditMetadata, *multipart.FileHeader, string, string) (File, error)
	UploadBatch(context.Context, AuditMetadata, []*multipart.FileHeader, string, string) (BatchUploadResult, error)
	Page(context.Context, FilePageQuery) (Page[File], error)
	Detail(context.Context, int64) (*File, error)
	Update(context.Context, AuditMetadata, int64, UpdateInput) error
	Delete(context.Context, AuditMetadata, int64) error
	DeleteBatch(context.Context, AuditMetadata, []int64) error
	SetStatus(context.Context, AuditMetadata, int64, int) error
	Open(context.Context, int64, bool) (FileResource, error)
}

type Handler struct{ service HandlerService }

// ApiEnvelope is the Swagger representation of the established API response.
//
//nolint:unused // referenced by Swaggo annotations below
type ApiEnvelope struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

func NewHandler(service HandlerService) (*Handler, error) {
	if service == nil {
		return nil, errors.New("file handler service is required")
	}
	return &Handler{service: service}, nil
}

// RegisterRoutes registers Java-compatible file routes on an already
// authenticated /api/system router group.
func RegisterRoutes(router gin.IRouter, handler *Handler) {
	files := router.Group("/file")
	files.POST("/upload", handler.upload)
	files.POST("/upload-batch", handler.uploadBatch)
	files.GET("/page", handler.page)
	files.POST("/batch-delete", handler.deleteBatch)
	files.GET("/:id", handler.detail)
	files.PUT("/:id", handler.update)
	files.DELETE("/:id", handler.delete)
	files.PATCH("/:id/status", handler.status)
	files.GET("/:id/download", handler.download)
	files.GET("/:id/view", handler.view)
}

type updateRequest struct {
	BusinessModule string  `json:"businessModule"`
	Remark         *string `json:"remark"`
}

type batchRequest struct {
	IDs []int64 `json:"ids"`
}

type statusRequest struct {
	Status *int `json:"status"`
}

// upload godoc
// @Summary 上传文件
// @Tags 文件管理
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "文件"
// @Param businessModule formData string false "业务模块"
// @Param remark formData string false "备注"
// @Success 200 {object} ApiEnvelope
// @Failure 400 {object} ApiEnvelope
// @Failure 401 {object} ApiEnvelope
// @Router /api/system/file/upload [post]
func (h *Handler) upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		writeFields(c, map[string]string{"file": "文件不能为空"})
		return
	}
	businessModule, remark := c.PostForm("businessModule"), c.PostForm("remark")
	if fields := validateMetadata(businessModule, &remark); len(fields) != 0 {
		writeFields(c, fields)
		return
	}
	result, err := h.service.Upload(c.Request.Context(), auditMetadata(c), file, businessModule, remark)
	writeResult(c, result, err)
}

// uploadBatch godoc
// @Summary 批量上传文件
// @Tags 文件管理
// @Security BearerAuth
// @Accept multipart/form-data
// @Produce json
// @Param files formData file true "文件列表"
// @Param businessModule formData string false "业务模块"
// @Param remark formData string false "备注"
// @Success 200 {object} ApiEnvelope
// @Failure 400 {object} ApiEnvelope
// @Failure 401 {object} ApiEnvelope
// @Router /api/system/file/upload-batch [post]
func (h *Handler) uploadBatch(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil || len(form.File["files"]) == 0 {
		writeFields(c, map[string]string{"files": "文件不能为空"})
		return
	}
	businessModule, remark := c.PostForm("businessModule"), c.PostForm("remark")
	if fields := validateMetadata(businessModule, &remark); len(fields) != 0 {
		writeFields(c, fields)
		return
	}
	result, err := h.service.UploadBatch(
		c.Request.Context(), auditMetadata(c), form.File["files"], businessModule, remark,
	)
	writeResult(c, result, err)
}

// page godoc
// @Summary 文件分页
// @Tags 文件管理
// @Security BearerAuth
// @Param page query int false "页码，默认 1"
// @Param pageSize query int false "每页条数，1-500"
// @Param originalName query string false "原始文件名"
// @Param businessModule query string false "业务模块"
// @Param mimeType query string false "MIME 类型"
// @Param status query int false "状态：0 或 1"
// @Success 200 {object} ApiEnvelope
// @Failure 400 {object} ApiEnvelope
// @Failure 401 {object} ApiEnvelope
// @Router /api/system/file/page [get]
func (h *Handler) page(c *gin.Context) {
	page, pageOK := queryInt(c, "page", 1)
	pageSize, pageSizeOK := queryInt(c, "pageSize", 10)
	status, statusOK := optionalStatus(c, "status")
	if !pageOK || !pageSizeOK || page < 1 || pageSize < 1 || pageSize > 500 || !statusOK {
		fields := map[string]string{}
		if !pageOK || page < 1 {
			fields["page"] = "页码必须大于 0"
		}
		if !pageSizeOK || pageSize < 1 || pageSize > 500 {
			fields["pageSize"] = "每页条数必须在 1 到 500 之间"
		}
		if !statusOK {
			fields["status"] = "状态只能为 0 或 1"
		}
		writeFields(c, fields)
		return
	}
	result, err := h.service.Page(c.Request.Context(), FilePageQuery{
		Page: page, PageSize: pageSize, OriginalName: c.Query("originalName"),
		BusinessModule: c.Query("businessModule"), MimeType: c.Query("mimeType"), Status: status,
	})
	writeResult(c, result, err)
}

// detail godoc
// @Summary 文件详情
// @Tags 文件管理
// @Security BearerAuth
// @Param id path int true "文件 ID"
// @Success 200 {object} ApiEnvelope
// @Failure 400 {object} ApiEnvelope
// @Failure 401 {object} ApiEnvelope
// @Router /api/system/file/{id} [get]
func (h *Handler) detail(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	result, err := h.service.Detail(c.Request.Context(), id)
	writeResult(c, result, err)
}

// update godoc
// @Summary 修改文件元信息
// @Tags 文件管理
// @Security BearerAuth
// @Param id path int true "文件 ID"
// @Param request body updateRequest true "文件元信息"
// @Success 200 {object} ApiEnvelope
// @Failure 400 {object} ApiEnvelope
// @Failure 401 {object} ApiEnvelope
// @Router /api/system/file/{id} [put]
func (h *Handler) update(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var request updateRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		writeFields(c, map[string]string{"body": "参数错误"})
		return
	}
	if fields := validateMetadata(request.BusinessModule, request.Remark); len(fields) != 0 {
		writeFields(c, fields)
		return
	}
	writeMutation(c, h.service.Update(c.Request.Context(), auditMetadata(c), id, UpdateInput(request)))
}

// delete godoc
// @Summary 删除文件
// @Tags 文件管理
// @Security BearerAuth
// @Param id path int true "文件 ID"
// @Success 200 {object} ApiEnvelope
// @Failure 400 {object} ApiEnvelope
// @Failure 401 {object} ApiEnvelope
// @Router /api/system/file/{id} [delete]
func (h *Handler) delete(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	writeMutation(c, h.service.Delete(c.Request.Context(), auditMetadata(c), id))
}

// deleteBatch godoc
// @Summary 批量删除文件
// @Tags 文件管理
// @Security BearerAuth
// @Param request body batchRequest true "文件 ID 列表"
// @Success 200 {object} ApiEnvelope
// @Failure 400 {object} ApiEnvelope
// @Failure 401 {object} ApiEnvelope
// @Router /api/system/file/batch-delete [post]
func (h *Handler) deleteBatch(c *gin.Context) {
	var request batchRequest
	if err := c.ShouldBindJSON(&request); err != nil || !validIDs(request.IDs) {
		writeFields(c, map[string]string{"ids": "ID 列表不能为空且必须为正整数"})
		return
	}
	writeMutation(c, h.service.DeleteBatch(c.Request.Context(), auditMetadata(c), request.IDs))
}

// status godoc
// @Summary 修改文件状态
// @Tags 文件管理
// @Security BearerAuth
// @Param id path int true "文件 ID"
// @Param request body statusRequest true "状态"
// @Success 200 {object} ApiEnvelope
// @Failure 400 {object} ApiEnvelope
// @Failure 401 {object} ApiEnvelope
// @Router /api/system/file/{id}/status [patch]
func (h *Handler) status(c *gin.Context) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	var request statusRequest
	if err := c.ShouldBindJSON(&request); err != nil || request.Status == nil || (*request.Status != 0 && *request.Status != 1) {
		writeFields(c, map[string]string{"status": "状态只能为 0 或 1"})
		return
	}
	writeMutation(c, h.service.SetStatus(c.Request.Context(), auditMetadata(c), id, *request.Status))
}

// download godoc
// @Summary 下载文件
// @Tags 文件管理
// @Security BearerAuth
// @Produce application/octet-stream
// @Param id path int true "文件 ID"
// @Success 200 {file} binary
// @Failure 400 {object} ApiEnvelope
// @Failure 401 {object} ApiEnvelope
// @Router /api/system/file/{id}/download [get]
func (h *Handler) download(c *gin.Context) { h.stream(c, false) }

// view godoc
// @Summary 预览文件
// @Tags 文件管理
// @Security BearerAuth
// @Produce application/octet-stream
// @Param id path int true "文件 ID"
// @Success 200 {file} binary
// @Failure 400 {object} ApiEnvelope
// @Failure 401 {object} ApiEnvelope
// @Router /api/system/file/{id}/view [get]
func (h *Handler) view(c *gin.Context) { h.stream(c, true) }

func (h *Handler) stream(c *gin.Context, view bool) {
	id, ok := pathID(c)
	if !ok {
		return
	}
	resource, err := h.service.Open(c.Request.Context(), id, view)
	if err != nil {
		writeError(c, err)
		return
	}
	defer func() { _ = resource.Reader.Close() }()

	contentType := resource.File.MimeType
	if parsed, _, parseErr := mime.ParseMediaType(contentType); parseErr == nil {
		contentType = parsed
	} else {
		contentType = "application/octet-stream"
	}
	disposition := "attachment"
	if view {
		disposition = "inline"
	}
	filename := strings.ReplaceAll(url.QueryEscape(resource.File.OriginalName), "+", "%20")
	c.DataFromReader(http.StatusOK, resource.File.FileSize, contentType, resource.Reader, map[string]string{
		"Content-Disposition": disposition + "; filename*=UTF-8''" + filename,
	})
}

func pathID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		writeFields(c, map[string]string{"id": "ID 不合法"})
		return 0, false
	}
	return id, true
}

func queryInt(c *gin.Context, key string, fallback int) (int, bool) {
	value := c.Query(key)
	if value == "" {
		return fallback, true
	}
	parsed, err := strconv.Atoi(value)
	return parsed, err == nil
}

func optionalStatus(c *gin.Context, key string) (*int, bool) {
	value := c.Query(key)
	if value == "" {
		return nil, true
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || (parsed != 0 && parsed != 1) {
		return nil, false
	}
	return &parsed, true
}

func validateMetadata(businessModule string, remark *string) map[string]string {
	fields := map[string]string{}
	if utf8.RuneCountInString(businessModule) > 50 {
		fields["businessModule"] = "业务模块长度不能超过 50"
	}
	if remark != nil && utf8.RuneCountInString(*remark) > 500 {
		fields["remark"] = "备注长度不能超过 500"
	}
	return fields
}

func validIDs(ids []int64) bool {
	if len(ids) == 0 {
		return false
	}
	for _, id := range ids {
		if id <= 0 {
			return false
		}
	}
	return true
}

func auditMetadata(c *gin.Context) AuditMetadata {
	principal, _ := auth.PrincipalFromContext(c.Request.Context())
	requestMeta, _ := platformhttp.RequestMetaFromContext(c.Request.Context())
	return AuditMetadata{
		ActorID: principal.UserID, RequestID: requestMeta.RequestID,
		ClientIP: requestMeta.ClientIP, UserAgent: requestMeta.UserAgent,
		RequestMethod: c.Request.Method, RequestURL: c.Request.URL.RequestURI(),
	}
}

func writeResult(c *gin.Context, value any, err error) {
	if err != nil {
		writeError(c, err)
		return
	}
	platformhttp.OK(c, value)
}

func writeMutation(c *gin.Context, err error) {
	if err != nil {
		writeError(c, err)
		return
	}
	platformhttp.OK(c, nil)
}

func writeFields(c *gin.Context, fields map[string]string) {
	platformhttp.WriteError(c, http.StatusBadRequest, platformhttp.CodeBadRequest, "参数错误", fields)
}

func writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		platformhttp.WriteError(c, http.StatusOK, platformhttp.CodeNotFound, ErrNotFound.Error(), nil)
	case errors.Is(err, ErrInvalid), errors.Is(err, ErrFileEmpty), errors.Is(err, ErrFileTooLarge):
		platformhttp.WriteError(c, http.StatusOK, platformhttp.CodeBadRequest, err.Error(), nil)
	default:
		platformhttp.WriteError(c, http.StatusInternalServerError, platformhttp.CodeInternalError, "系统错误", nil)
	}
}
