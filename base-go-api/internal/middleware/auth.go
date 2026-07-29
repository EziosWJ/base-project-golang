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

type AuthMiddleware struct {
	sessions *auth.SessionStore
}

func NewAuthMiddleware(sessions *auth.SessionStore) *AuthMiddleware {
	return &AuthMiddleware{sessions: sessions}
}

func (m *AuthMiddleware) Handle(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, request *http.Request) {
		ctx := requestmeta.WithRequest(request.Context(), request)
		request = request.WithContext(ctx)
		if request.Method == http.MethodOptions || request.URL.Path == "/api/auth/login" {
			next(w, request)
			return
		}
		token := strings.TrimSpace(strings.TrimPrefix(request.Header.Get("Authorization"), "Bearer"))
		userID, ok := m.sessions.UserID(token)
		if !ok {
			httpx.ErrorCtx(ctx, w, response.Unauthorized())
			return
		}
		ctx = auth.WithUserID(ctx, userID)
		ctx = service.WithRequestToken(ctx, request.Header.Get("Authorization"))
		next(w, request.WithContext(ctx))
	}
}
