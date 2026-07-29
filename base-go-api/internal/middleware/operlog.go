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

// OperLogMiddleware 在业务请求执行完成后记录操作日志。
// 它只关注会改变系统状态的接口，避免为普通查询制造大量无效审计数据。
type OperLogMiddleware struct{ db *pgxpool.Pool }

// NewOperLogMiddleware 创建操作日志中间件。
func NewOperLogMiddleware(db *pgxpool.Pool) *OperLogMiddleware { return &OperLogMiddleware{db: db} }

// Handle 包装业务 Handler，统计耗时、捕获请求参数和响应状态，并写入 sys_oper_log。
func (m *OperLogMiddleware) Handle(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		module, operation, ok := operationInfo(r)
		if !ok {
			next(w, r)
			return
		}

		started := time.Now()
		params := captureRequest(r)
		// statusRecorder 在不影响原始响应写出的前提下，记录 HTTP 状态和部分响应体。
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next(recorder, r)

		// 请求结束后仍需要完成审计日志写入，因此移除客户端取消信号，但保留 context 中的值。
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

		// 操作日志不应反向影响正常业务响应，因此记录失败时不再向客户端返回新的错误。
		_, _ = m.db.Exec(ctx, `INSERT INTO sys_oper_log (module_name, operation_type, request_method, request_url, operator_id, operator_name, operator_ip, request_params, cost_time, operation_status, error_message, operation_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())`, module, operation, r.Method, r.URL.RequestURI(), nullableUserID(userID), nullableText(operatorName), requestmeta.IP(ctx), params, time.Since(started).Milliseconds(), status, nullableText(message))
	}
}

// statusRecorder 代理原始 ResponseWriter，并缓存有限长度的响应体供结果判定使用。
type statusRecorder struct {
	http.ResponseWriter
	status int
	body   bytes.Buffer
}

// WriteHeader 记录实际 HTTP 状态码后继续写给客户端。
func (w *statusRecorder) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

// Write 最多缓存前 8 KiB 响应体，同时始终将完整内容写给原始 ResponseWriter。
func (w *statusRecorder) Write(value []byte) (int, error) {
	if w.body.Len() < 8192 {
		_, _ = w.body.Write(value)
	}
	return w.ResponseWriter.Write(value)
}

// failed 同时兼容 HTTP 错误状态和项目统一响应体中的业务错误码。
func (w *statusRecorder) failed() bool {
	if w.status >= http.StatusBadRequest {
		return true
	}
	var payload struct {
		Code int `json:"code"`
	}
	return json.Unmarshal(w.body.Bytes(), &payload) == nil && payload.Code != 0 && payload.Code != http.StatusOK
}

// operationInfo 根据请求方法和路径判断是否需要审计，并映射为业务模块和操作类型。
func operationInfo(r *http.Request) (string, string, bool) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut && r.Method != http.MethodPatch && r.Method != http.MethodDelete {
		return "", "", false
	}
	// 认证接口由登录日志负责；日志管理自身也不再产生操作日志，避免递归记录。
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

// operationType 将 HTTP 写操作映射为统一的审计操作类型。
func operationType(method string) string {
	if method == http.MethodPost {
		return "CREATE"
	}
	if method == http.MethodDelete {
		return "DELETE"
	}
	return "UPDATE"
}

// nullableUserID 将匿名或未知用户的 0 值转换为数据库 NULL。
func nullableUserID(value int64) any {
	if value == 0 {
		return nil
	}
	return value
}

// nullableText 将空字符串转换为数据库 NULL，减少无意义空值。
func nullableText(value string) any {
	if value == "" {
		return nil
	}
	return value
}

// captureRequest 提取可安全记录的请求参数，并在读取 Body 后恢复它供后续 Handler 继续消费。
func captureRequest(r *http.Request) string {
	if r.Body == nil || r.Method == http.MethodGet {
		return r.URL.RawQuery
	}
	// 密码接口不记录请求体，避免敏感凭据进入操作日志。
	if strings.Contains(r.URL.Path, "/password") {
		return "sensitive request omitted"
	}
	// 文件内容不适合写入数据库日志，只记录请求类型。
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/") {
		return "multipart/form-data"
	}

	// 只读取最多 4097 字节：超过 4 KiB 时判定为大请求并省略日志内容。
	content, err := io.ReadAll(io.LimitReader(r.Body, 4097))
	if err != nil {
		return ""
	}
	if len(content) > 4096 {
		// 已读取的前缀必须重新拼回 Body，否则后续业务只能收到剩余部分。
		r.Body = io.NopCloser(io.MultiReader(bytes.NewReader(content), r.Body))
		return "request body omitted"
	}

	// 普通小请求完整恢复 Body，确保日志采集对业务 Handler 透明。
	r.Body = io.NopCloser(bytes.NewReader(content))
	return string(content)
}
