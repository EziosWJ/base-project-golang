package userdept

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/auth"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/response"
	"github.com/EziosWJ/base-project-golang/base-go-api/internal/svc"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/zeromicro/go-zero/rest/httpx"
	"github.com/zeromicro/go-zero/rest/pathvar"
)

type service struct {
	db              *pgxpool.Pool
	sessions        *auth.SessionStore
	defaultPassword string
}

type handler struct {
	service *service
}

func newService(ctx *svc.ServiceContext) *service {
	password := ctx.Config.DefaultPassword
	if password == "" {
		password = "admin123"
	}
	return &service{db: ctx.DB, sessions: ctx.Sessions, defaultPassword: password}
}

func decodeBody(request *http.Request, target any) error {
	if err := json.NewDecoder(request.Body).Decode(target); err != nil {
		return response.Validation(map[string]string{"body": "请求体格式不正确"})
	}
	return nil
}

func pathID(request *http.Request) (int64, error) {
	id, err := strconv.ParseInt(pathvar.Vars(request)["id"], 10, 64)
	if err != nil || id <= 0 {
		return 0, response.Validation(map[string]string{"id": "ID 不正确"})
	}
	return id, nil
}

func currentUserID(ctx context.Context) (int64, error) {
	userID, ok := auth.UserIDFromContext(ctx)
	if !ok {
		return 0, response.Unauthorized()
	}
	return userID, nil
}

func writeResult(ctx context.Context, writer http.ResponseWriter, value any, err error) {
	if err != nil {
		httpx.ErrorCtx(ctx, writer, err)
		return
	}
	httpx.OkJsonCtx(ctx, writer, value)
}

func pageValues(request *http.Request) (int64, int64, error) {
	page, pageSize := int64(1), int64(10)
	var err error
	if raw := request.URL.Query().Get("page"); raw != "" {
		page, err = strconv.ParseInt(raw, 10, 64)
		if err != nil || page < 1 {
			return 0, 0, response.Validation(map[string]string{"page": "页码不能小于 1"})
		}
	}
	if raw := request.URL.Query().Get("pageSize"); raw != "" {
		pageSize, err = strconv.ParseInt(raw, 10, 64)
		if err != nil || pageSize < 1 || pageSize > 500 {
			return 0, 0, response.Validation(map[string]string{"pageSize": "每页条数必须在 1 到 500 之间"})
		}
	}
	return page, pageSize, nil
}

func normalizedString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
