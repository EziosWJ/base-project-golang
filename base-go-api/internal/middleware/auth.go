package middleware

import (
	"net/http"
	"strings"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/auth"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/requestmeta"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/service"
	"github.com/zeromicro/go-zero/rest/httpx"
)

// AuthMiddleware 负责统一校验登录态，并将当前用户信息写入请求上下文。
// 业务 Handler 只需要从 context 读取用户信息，无需重复解析 Authorization 请求头。
type AuthMiddleware struct {
	sessions *auth.SessionStore
}

// NewAuthMiddleware 创建认证中间件，并复用应用级会话存储。
func NewAuthMiddleware(sessions *auth.SessionStore) *AuthMiddleware {
	return &AuthMiddleware{sessions: sessions}
}

// Handle 对除登录接口和 CORS 预检外的请求执行 Bearer Token 认证。
func (m *AuthMiddleware) Handle(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, request *http.Request) {
		// 先提取 IP、User-Agent 等请求元信息，后续认证、登录日志和操作日志均可复用。
		ctx := requestmeta.WithRequest(request.Context(), request)
		request = request.WithContext(ctx)

		// OPTIONS 由 CORS 流程处理；登录接口本身必须允许匿名访问。
		if request.Method == http.MethodOptions || request.URL.Path == "/api/auth/login" {
			next(w, request)
			return
		}

		// 前端使用 Authorization: Bearer <token>，这里只保存实际 Token 用于会话查询。
		token := strings.TrimSpace(strings.TrimPrefix(request.Header.Get("Authorization"), "Bearer"))
		userID, ok := m.sessions.UserID(token)
		if !ok {
			httpx.ErrorCtx(ctx, w, response.Unauthorized())
			return
		}

		// 用户 ID 供业务代码识别当前用户；完整请求头保留给退出登录逻辑删除当前 Token。
		ctx = auth.WithUserID(ctx, userID)
		ctx = service.WithRequestToken(ctx, request.Header.Get("Authorization"))
		next(w, request.WithContext(ctx))
	}
}
