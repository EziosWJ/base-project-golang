package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/auth"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/requestmeta"
	"github.com/jackc/pgx/v5/pgxpool"
)

type OperLogMiddleware struct{ db *pgxpool.Pool }

func NewOperLogMiddleware(db *pgxpool.Pool) *OperLogMiddleware { return &OperLogMiddleware{db: db} }

func (m *OperLogMiddleware) Handle(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		module, operation, ok := operationInfo(r)
		if !ok {
			next(w, r)
			return
		}
		started := time.Now()
		params := captureRequest(r)
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next(recorder, r)
		ctx := context.WithoutCancel(r.Context())
		userID, _ := auth.UserIDFromContext(ctx)
		operatorName := ""
		if userID > 0 {
			_ = m.db.QueryRow(ctx, `SELECT username FROM sys_user WHERE id=$1`, userID).Scan(&operatorName)
		}
		status, message := "SUCCESS", ""
		if recorder.failed() {
			status, message = "FAIL", http.StatusText(recorder.status)
		}
		_, _ = m.db.Exec(ctx, `INSERT INTO sys_oper_log (module_name, operation_type, request_method, request_url, operator_id, operator_name, operator_ip, request_params, cost_time, operation_status, error_message, operation_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`, module, operation, r.Method, r.URL.RequestURI(), nullableUserID(userID), nullableText(operatorName), requestmeta.IP(ctx), params, time.Since(started).Milliseconds(), status, nullableText(message))
	}
}

type statusRecorder struct {
	http.ResponseWriter
	status int
	body   bytes.Buffer
}

func (w *statusRecorder) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}
func (w *statusRecorder) Write(value []byte) (int, error) {
	if w.body.Len() < 8192 {
		_, _ = w.body.Write(value)
	}
	return w.ResponseWriter.Write(value)
}
func (w *statusRecorder) failed() bool {
	if w.status >= http.StatusBadRequest {
		return true
	}
	var payload struct {
		Code int `json:"code"`
	}
	return json.Unmarshal(w.body.Bytes(), &payload) == nil && payload.Code != 0 && payload.Code != http.StatusOK
}

func operationInfo(r *http.Request) (string, string, bool) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut && r.Method != http.MethodPatch && r.Method != http.MethodDelete {
		return "", "", false
	}
	if strings.HasPrefix(r.URL.Path, "/api/auth/") || strings.Contains(r.URL.Path, "-log") {
		return "", "", false
	}
	for prefix, module := range map[string]string{"/api/system/user": "用户管理", "/api/system/dept": "部门管理", "/api/system/role": "角色管理", "/api/system/menu": "菜单管理", "/api/system/dict": "字典管理", "/api/system/config": "配置管理", "/api/system/file": "文件管理"} {
		if strings.HasPrefix(r.URL.Path, prefix) {
			return module, operationType(r.Method), true
		}
	}
	return "", "", false
}

func operationType(method string) string {
	if method == http.MethodPost {
		return "CREATE"
	}
	if method == http.MethodDelete {
		return "DELETE"
	}
	return "UPDATE"
}
func nullableUserID(value int64) any {
	if value == 0 {
		return nil
	}
	return value
}
func nullableText(value string) any {
	if value == "" {
		return nil
	}
	return value
}
func captureRequest(r *http.Request) string {
	if r.Body == nil || r.Method == http.MethodGet {
		return r.URL.RawQuery
	}
	if strings.Contains(r.URL.Path, "/password") {
		return "sensitive request omitted"
	}
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/") {
		return "multipart/form-data"
	}
	content, err := io.ReadAll(io.LimitReader(r.Body, 4097))
	if err != nil {
		return ""
	}
	if len(content) > 4096 {
		r.Body = io.NopCloser(io.MultiReader(bytes.NewReader(content), r.Body))
		return "request body omitted"
	}
	r.Body = io.NopCloser(bytes.NewReader(content))
	return string(content)
}
