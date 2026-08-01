package filemgmt

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"net/url"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/auth"
	platformhttp "github.com/EziosWJ/base-project-golang/base-go-api/internal/platform/http"
)

// uploadOption configures a multipart upload request body.
type uploadOption struct {
	field          string
	filename       string
	content        string
	contentType    string
	businessModule string
	remark         string
}

func multipartBody(t *testing.T, options ...uploadOption) (string, []byte) {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for _, option := range options {
		header := make(textproto.MIMEHeader)
		header.Set("Content-Disposition", `form-data; name="`+option.field+`"; filename="`+option.filename+`"`)
		if option.contentType != "" {
			header.Set("Content-Type", option.contentType)
		}
		part, err := writer.CreatePart(header)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = part.Write([]byte(option.content)); err != nil {
			t.Fatal(err)
		}
	}
	if len(options) == 1 && options[0].businessModule != "" {
		if err := writer.WriteField("businessModule", options[0].businessModule); err != nil {
			t.Fatal(err)
		}
	}
	if len(options) == 1 && options[0].remark != "" {
		if err := writer.WriteField("remark", options[0].remark); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	return writer.FormDataContentType(), body.Bytes()
}

func multipartRequest(t *testing.T, method, path, contentType string, body []byte) *http.Request {
	t.Helper()
	request := httptest.NewRequest(method, path, bytes.NewReader(body))
	request.Header.Set("Content-Type", contentType)
	return request
}

func newHandlerRouter(t *testing.T, service HandlerService) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	handler, err := NewHandler(service)
	if err != nil {
		t.Fatal(err)
	}
	router := gin.New()
	router.Use(platformhttp.RequestMetadata())
	RegisterRoutes(router.Group("/api/system"), handler)
	return router
}

func newServiceRouter(t *testing.T, store Store, storage Storage) (*gin.Engine, *memoryStore, *memoryAudit) {
	t.Helper()
	if storage == nil {
		var err error
		storage, err = NewLocalStorage(t.TempDir())
		if err != nil {
			t.Fatal(err)
		}
	}
	audit := new(memoryAudit)
	service, err := NewService(store, storage, audit)
	if err != nil {
		t.Fatal(err)
	}
	return newHandlerRouter(t, service), store.(*memoryStore), audit
}

func authenticated(request *http.Request) *http.Request {
	ctx := auth.ContextWithPrincipal(request.Context(), auth.Principal{UserID: 7, JTI: "jti"})
	return request.WithContext(ctx)
}

func decodeEnvelope(t *testing.T, response *httptest.ResponseRecorder) (int, map[string]any) {
	t.Helper()
	var payload map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v body=%s", err, response.Body.String())
	}
	return response.Code, payload
}

func wantValidationError(t *testing.T, response *httptest.ResponseRecorder, wantField string) {
	t.Helper()
	status, payload := decodeEnvelope(t, response)
	if status != http.StatusBadRequest || payload["code"].(float64) != platformhttp.CodeBadRequest {
		t.Fatalf("status=%d payload=%v", status, payload)
	}
	fields := payload["data"].(map[string]any)
	if _, ok := fields[wantField]; !ok {
		t.Fatalf("fields=%v want %q", fields, wantField)
	}
}

func wantEnvelopeOK(t *testing.T, response *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	status, payload := decodeEnvelope(t, response)
	if status != http.StatusOK || payload["code"].(float64) != platformhttp.CodeSuccess {
		t.Fatalf("status=%d payload=%v", status, payload)
	}
	return payload
}

func wantNotFoundEnvelope(t *testing.T, response *httptest.ResponseRecorder) {
	t.Helper()
	status, payload := decodeEnvelope(t, response)
	if status != http.StatusOK || payload["code"].(float64) != platformhttp.CodeNotFound || payload["message"] != ErrNotFound.Error() {
		t.Fatalf("status=%d payload=%v", status, payload)
	}
}

func TestUploadContractServesFileMetadata(t *testing.T) {
	t.Parallel()
	router, store, audit := newServiceRouter(t, new(memoryStore), nil)
	contentType, body := multipartBody(t, uploadOption{field: "file", filename: "greeting.txt", content: "hello", contentType: "text/plain", businessModule: "system", remark: "example"})
	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(multipartRequest(t, http.MethodPost, "/api/system/file/upload", contentType, body)))
	payload := wantEnvelopeOK(t, response)
	data := payload["data"].(map[string]any)
	if data["id"].(float64) != 1 || data["originalName"] != "greeting.txt" || data["fileSize"].(float64) != 5 || data["mimeType"] != "text/plain" || data["accessUrl"] != "/api/system/file/1/view" || data["businessModule"] != "system" || data["remark"] != "example" || data["status"].(float64) != 1 {
		t.Fatalf("data=%v", data)
	}
	if store.file.AccessURL != data["accessUrl"] || len(audit.events) != 1 || audit.events[0].Action != "file.upload" || audit.events[0].ResourceID != 1 {
		t.Fatalf("store=%+v audit=%+v", store.file, audit.events)
	}
}

func TestUploadContractRejectsMissingFile(t *testing.T) {
	t.Parallel()
	router, _, _ := newServiceRouter(t, new(memoryStore), nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(multipartRequest(t, http.MethodPost, "/api/system/file/upload", "multipart/form-data; boundary=only", nil)))
	wantValidationError(t, response, "file")
}

func TestUploadContractRejectsOversizeFile(t *testing.T) {
	t.Parallel()
	router, _, _ := newServiceRouter(t, new(memoryStore), nil)
	contentType, body := multipartBody(t, uploadOption{field: "file", filename: "huge.bin", content: strings.Repeat("x", MaxFileSize+1)})
	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(multipartRequest(t, http.MethodPost, "/api/system/file/upload", contentType, body)))
	// 超大文件走业务信封：HTTP 200 + code 400，React 以 payload.code 判定失败。
	status, payload := decodeEnvelope(t, response)
	if status != http.StatusOK || payload["code"].(float64) != platformhttp.CodeBadRequest || payload["message"] != ErrFileTooLarge.Error() {
		t.Fatalf("status=%d payload=%v", status, payload)
	}
}

func TestUploadContractValidatesMetadata(t *testing.T) {
	t.Parallel()
	router, _, _ := newServiceRouter(t, new(memoryStore), nil)
	for _, test := range []struct {
		name         string
		option       uploadOption
		wantField    string
	}{
		{name: "businessModule too long", option: uploadOption{field: "file", filename: "a.txt", content: "x", businessModule: strings.Repeat("业", 51)}, wantField: "businessModule"},
		{name: "remark too long", option: uploadOption{field: "file", filename: "a.txt", content: "x", remark: strings.Repeat("注", 501)}, wantField: "remark"},
	} {
		t.Run(test.name, func(t *testing.T) {
			contentType, body := multipartBody(t, test.option)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, authenticated(multipartRequest(t, http.MethodPost, "/api/system/file/upload", contentType, body)))
			wantValidationError(t, response, test.wantField)
		})
	}
}

func TestUploadBatchContractServesPerFileResults(t *testing.T) {
	t.Parallel()
	router, _, audit := newServiceRouter(t, new(memoryStore), nil)
	contentType, body := multipartBody(t,
		uploadOption{field: "files", filename: "one.txt", content: "1"},
		uploadOption{field: "files", filename: "two.txt", content: "22"},
	)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(multipartRequest(t, http.MethodPost, "/api/system/file/upload-batch", contentType, body)))
	payload := wantEnvelopeOK(t, response)
	data := payload["data"].(map[string]any)
	if len(data["succeeded"].([]any)) != 2 {
		t.Fatalf("data=%v", data)
	}
	if _, ok := data["failed"].([]any); !ok {
		t.Fatalf("failed must be an array, got %v", data["failed"])
	}
	if len(audit.events) != 2 || audit.events[0].Action != "file.upload" || audit.events[1].Action != "file.upload" {
		t.Fatalf("audit=%+v", audit.events)
	}
}

func TestUploadBatchContractRejectsEmptyFiles(t *testing.T) {
	t.Parallel()
	router, _, _ := newServiceRouter(t, new(memoryStore), nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(multipartRequest(t, http.MethodPost, "/api/system/file/upload-batch", "multipart/form-data; boundary=only", nil)))
	wantValidationError(t, response, "files")
}

func TestPageContractValidatesPagination(t *testing.T) {
	t.Parallel()
	for _, test := range []struct {
		name      string
		path      string
		wantField string
	}{
		{name: "page zero", path: "/api/system/file/page?page=0", wantField: "page"},
		{name: "page not a number", path: "/api/system/file/page?page=abc", wantField: "page"},
		{name: "pageSize zero", path: "/api/system/file/page?pageSize=0", wantField: "pageSize"},
		{name: "pageSize too large", path: "/api/system/file/page?pageSize=501", wantField: "pageSize"},
		{name: "pageSize not a number", path: "/api/system/file/page?pageSize=abc", wantField: "pageSize"},
		{name: "status invalid", path: "/api/system/file/page?status=2", wantField: "status"},
	} {
		t.Run(test.name, func(t *testing.T) {
			router, _, _ := newServiceRouter(t, new(memoryStore), nil)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodGet, test.path, nil)))
			wantValidationError(t, response, test.wantField)
		})
	}
}

func TestPageContractFiltersByQuery(t *testing.T) {
	t.Parallel()
	store := new(memoryStore)
	store.Create(nil, File{OriginalName: "report.pdf", BusinessModule: "system", MimeType: "application/pdf", Status: StatusEnabled})
	store.Create(nil, File{OriginalName: "photo.png", BusinessModule: "avatar", MimeType: "image/png", Status: StatusEnabled})
	store.Create(nil, File{OriginalName: "draft.pdf", BusinessModule: "system", MimeType: "application/pdf", Status: StatusDisabled})
	router, _, _ := newServiceRouter(t, store, nil)
	for _, test := range []struct {
		name      string
		path      string
		wantTotal float64
	}{
		{name: "all", path: "/api/system/file/page?page=1&pageSize=10", wantTotal: 3},
		{name: "by originalName", path: "/api/system/file/page?page=1&pageSize=10&originalName=report", wantTotal: 1},
		{name: "by businessModule", path: "/api/system/file/page?page=1&pageSize=10&businessModule=system", wantTotal: 2},
		{name: "by mimeType", path: "/api/system/file/page?page=1&pageSize=10&mimeType=png", wantTotal: 1},
		{name: "by status", path: "/api/system/file/page?page=1&pageSize=10&status=0", wantTotal: 1},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodGet, test.path, nil)))
			payload := wantEnvelopeOK(t, response)
			data := payload["data"].(map[string]any)
			if data["total"].(float64) != test.wantTotal {
				t.Fatalf("data=%v want total %v", data, test.wantTotal)
			}
		})
	}
}

func TestDetailContractServesRecordAndNotFoundEnvelope(t *testing.T) {
	t.Parallel()
	store := new(memoryStore)
	store.Create(nil, File{OriginalName: "report.pdf", MimeType: "application/pdf", FileSize: 5})
	router, _, _ := newServiceRouter(t, store, nil)

	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodGet, "/api/system/file/1", nil)))
	payload := wantEnvelopeOK(t, response)
	data := payload["data"].(map[string]any)
	if data["originalName"] != "report.pdf" || data["mimeType"] != "application/pdf" {
		t.Fatalf("data=%v", data)
	}

	response = httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodGet, "/api/system/file/99", nil)))
	wantNotFoundEnvelope(t, response)
}

func TestDetailContractRejectsInvalidID(t *testing.T) {
	t.Parallel()
	router, _, _ := newServiceRouter(t, new(memoryStore), nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodGet, "/api/system/file/abc", nil)))
	wantValidationError(t, response, "id")
}

func TestUpdateContractServesMutationAndAudits(t *testing.T) {
	t.Parallel()
	store := new(memoryStore)
	store.Create(nil, File{OriginalName: "a.txt", BusinessModule: "old"})
	router, _, audit := newServiceRouter(t, store, nil)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPut, "/api/system/file/1", strings.NewReader(`{"businessModule":"system","remark":"新备注"}`))
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(response, authenticated(request))
	wantEnvelopeOK(t, response)
	if store.file.BusinessModule != "system" || store.file.Remark == nil || *store.file.Remark != "新备注" {
		t.Fatalf("store=%+v", store.file)
	}
	if len(audit.events) != 1 || audit.events[0].Action != "file.update" || audit.events[0].ResourceID != 1 {
		t.Fatalf("audit=%+v", audit.events)
	}
}

func TestUpdateContractValidatesMetadata(t *testing.T) {
	t.Parallel()
	router, _, _ := newServiceRouter(t, new(memoryStore), nil)
	for _, test := range []struct {
		name      string
		body      string
		wantField string
	}{
		{name: "businessModule too long", body: `{"businessModule":"` + strings.Repeat("业", 51) + `"}`, wantField: "businessModule"},
		{name: "remark too long", body: `{"remark":"` + strings.Repeat("注", 501) + `"}`, wantField: "remark"},
		{name: "invalid json body", body: `{`, wantField: "body"},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodPut, "/api/system/file/1", strings.NewReader(test.body))
			request.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(response, authenticated(request))
			wantValidationError(t, response, test.wantField)
		})
	}
}

func TestUpdateContractMapsNotFound(t *testing.T) {
	t.Parallel()
	router, _, _ := newServiceRouter(t, new(memoryStore), nil)
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPut, "/api/system/file/99", strings.NewReader(`{"businessModule":"system"}`))
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(response, authenticated(request))
	wantNotFoundEnvelope(t, response)
}

func TestDeleteContractRemovesPhysicalFileAndAudits(t *testing.T) {
	t.Parallel()
	store := new(memoryStore)
	store.Create(nil, File{OriginalName: "a.txt", StoragePath: "2026/07/31/abc.txt", FileSize: 1})
	router, _, audit := newServiceRouter(t, store, nil)

	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodDelete, "/api/system/file/1", nil)))
	wantEnvelopeOK(t, response)
	if store.file.Deleted != 1 || store.deletedPath != "2026/07/31/abc.txt" {
		t.Fatalf("store=%+v deletedPath=%q", store.file, store.deletedPath)
	}
	if len(audit.events) != 1 || audit.events[0].Action != "file.delete" || audit.events[0].ResourceID != 1 {
		t.Fatalf("audit=%+v", audit.events)
	}
}

func TestDeleteContractMapsNotFound(t *testing.T) {
	t.Parallel()
	router, _, _ := newServiceRouter(t, new(memoryStore), nil)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodDelete, "/api/system/file/99", nil)))
	wantNotFoundEnvelope(t, response)
}

func TestBatchDeleteContractValidatesIDs(t *testing.T) {
	t.Parallel()
	router, _, _ := newServiceRouter(t, new(memoryStore), nil)
	for _, test := range []struct {
		name string
		body string
	}{
		{name: "empty ids", body: `{"ids":[]}`},
		{name: "non-positive ids", body: `{"ids":[1,-2]}`},
		{name: "missing field", body: `{}`},
		{name: "invalid json", body: `{`},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodPost, "/api/system/file/batch-delete", strings.NewReader(test.body))
			request.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(response, authenticated(request))
			wantValidationError(t, response, "ids")
		})
	}
}

func TestBatchDeleteContractDeletesAllAndAudits(t *testing.T) {
	t.Parallel()
	store := new(memoryStore)
	store.Create(nil, File{OriginalName: "a.txt", StoragePath: "2026/07/31/a.txt"})
	store.Create(nil, File{OriginalName: "b.txt", StoragePath: "2026/07/31/b.txt"})
	router, _, audit := newServiceRouter(t, store, nil)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/system/file/batch-delete", strings.NewReader(`{"ids":[1,2]}`))
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(response, authenticated(request))
	wantEnvelopeOK(t, response)
	for _, file := range store.records {
		if file.Deleted != 1 {
			t.Fatalf("record %d must be soft-deleted: %+v", file.ID, file)
		}
	}
	if len(audit.events) != 2 || audit.events[0].Action != "file.delete" || audit.events[0].ResourceID != 1 || audit.events[1].ResourceID != 2 {
		t.Fatalf("audit=%+v", audit.events)
	}
}

func TestStatusContractServesMutationAndAudits(t *testing.T) {
	t.Parallel()
	store := new(memoryStore)
	store.Create(nil, File{OriginalName: "a.txt", Status: StatusEnabled})
	router, _, audit := newServiceRouter(t, store, nil)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPatch, "/api/system/file/1/status", strings.NewReader(`{"status":0}`))
	request.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(response, authenticated(request))
	wantEnvelopeOK(t, response)
	if store.file.Status != StatusDisabled {
		t.Fatalf("store=%+v", store.file)
	}
	if len(audit.events) != 1 || audit.events[0].Action != "file.status" || audit.events[0].ResourceID != 1 {
		t.Fatalf("audit=%+v", audit.events)
	}
}

func TestStatusContractRejectsInvalidStatus(t *testing.T) {
	t.Parallel()
	router, _, _ := newServiceRouter(t, new(memoryStore), nil)
	for _, test := range []struct {
		name string
		body string
	}{
		{name: "status 2", body: `{"status":2}`},
		{name: "status missing", body: `{}`},
		{name: "status string", body: `{"status":"1"}`},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodPatch, "/api/system/file/1/status", strings.NewReader(test.body))
			request.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(response, authenticated(request))
			wantValidationError(t, response, "status")
		})
	}
}

func TestStreamContractServesDownloadAndView(t *testing.T) {
	t.Parallel()
	const content = "hello file content"
	storage, err := NewLocalStorage(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	stored, err := storage.Save(context.Background(), "hello.txt", strings.NewReader(content))
	if err != nil {
		t.Fatal(err)
	}
	store := new(memoryStore)
	store.Create(nil, File{OriginalName: "hello.txt", MimeType: "text/plain; charset=utf-8", FileSize: int64(len(content)), StoragePath: stored.Path})
	router, _, _ := newServiceRouter(t, store, storage)

	for _, test := range []struct {
		name          string
		path          string
		wantDispos    string
	}{
		{name: "download", path: "/api/system/file/1/download", wantDispos: "attachment"},
		{name: "view", path: "/api/system/file/1/view", wantDispos: "inline"},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodGet, test.path, nil)))
			if response.Code != http.StatusOK {
				t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
			}
			if response.Body.String() != content {
				t.Fatalf("body=%q", response.Body.String())
			}
			if disposition := response.Header().Get("Content-Disposition"); !strings.HasPrefix(disposition, test.wantDispos+"; filename*=UTF-8''hello.txt") {
				t.Fatalf("Content-Disposition=%q", disposition)
			}
			if contentType := response.Header().Get("Content-Type"); !strings.HasPrefix(contentType, "text/plain") {
				t.Fatalf("Content-Type=%q", contentType)
			}
		})
	}
}

func TestStreamContractMapsMissingFileToNotFoundEnvelope(t *testing.T) {
	t.Parallel()
	store := new(memoryStore)
	store.Create(nil, File{OriginalName: "ghost.txt", MimeType: "text/plain", FileSize: 3, StoragePath: "2026/07/31/ghost.txt"})
	router, _, _ := newServiceRouter(t, store, nil)
	for _, path := range []string{"/api/system/file/1/download", "/api/system/file/1/view"} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodGet, path, nil)))
		wantNotFoundEnvelope(t, response)
	}
}

func TestStreamContractEscapesFilenameInDisposition(t *testing.T) {
	t.Parallel()
	storage, err := NewLocalStorage(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	stored, err := storage.Save(context.Background(), "测试 文件.txt", strings.NewReader("x"))
	if err != nil {
		t.Fatal(err)
	}
	store := new(memoryStore)
	store.Create(nil, File{OriginalName: "测试 文件.txt", MimeType: "text/plain", FileSize: 1, StoragePath: stored.Path})
	router, _, _ := newServiceRouter(t, store, storage)

	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(httptest.NewRequest(http.MethodGet, "/api/system/file/1/download", nil)))
	if response.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
	want := "attachment; filename*=UTF-8''" + strings.ReplaceAll(url.QueryEscape("测试 文件.txt"), "+", "%20")
	if disposition := response.Header().Get("Content-Disposition"); disposition != want {
		t.Fatalf("Content-Disposition=%q want %q", disposition, want)
	}
}

func TestRoutesRegistered(t *testing.T) {
	t.Parallel()
	router, _, _ := newServiceRouter(t, new(memoryStore), nil)
	want := map[string]string{
		"POST /api/system/file/upload":        "",
		"POST /api/system/file/upload-batch":  "",
		"GET /api/system/file/page":           "",
		"POST /api/system/file/batch-delete":  "",
		"GET /api/system/file/:id":            "",
		"PUT /api/system/file/:id":            "",
		"DELETE /api/system/file/:id":         "",
		"PATCH /api/system/file/:id/status":   "",
		"GET /api/system/file/:id/download":   "",
		"GET /api/system/file/:id/view":       "",
	}
	for _, route := range router.Routes() {
		delete(want, route.Method+" "+route.Path)
	}
	if len(want) != 0 {
		t.Fatalf("missing routes: %v", want)
	}
}

func TestAuditMetadataCarriesRequestContext(t *testing.T) {
	t.Parallel()
	router, _, audit := newServiceRouter(t, new(memoryStore), nil)
	contentType, body := multipartBody(t, uploadOption{field: "file", filename: "a.txt", content: "x"})
	request := multipartRequest(t, http.MethodPost, "/api/system/file/upload", contentType, body)
	request.Header.Set(platformhttp.RequestIDHeader, "request-42")
	request.Header.Set("User-Agent", "handler-test")
	request.RemoteAddr = "203.0.113.9:1234"
	response := httptest.NewRecorder()
	router.ServeHTTP(response, authenticated(request))
	wantEnvelopeOK(t, response)
	event := audit.events[0]
	if event.Action != "file.upload" || event.Metadata.ActorID != 7 || event.Metadata.RequestID != "request-42" || event.Metadata.ClientIP != "203.0.113.9" || event.Metadata.UserAgent != "handler-test" || event.Metadata.RequestMethod != http.MethodPost || event.Metadata.RequestURL != "/api/system/file/upload" {
		t.Fatalf("audit event = %+v", event)
	}
}
