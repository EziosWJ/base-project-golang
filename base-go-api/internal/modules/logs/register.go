package logs

import (
	"net/http"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/svc"
	"github.com/zeromicro/go-zero/rest"
)

// Register adds the login and operation log routes to the REST server.
func Register(server *rest.Server, ctx *svc.ServiceContext) {
	h := NewHandler(ctx)
	server.AddRoutes([]rest.Route{
		{Method: http.MethodGet, Path: "/api/system/login-log/page", Handler: h.loginLogPage},
		{Method: http.MethodDelete, Path: "/api/system/login-log/clear", Handler: h.clearLoginLogs},
		{Method: http.MethodPost, Path: "/api/system/login-log/batch-delete", Handler: h.batchDeleteLoginLogs},
		{Method: http.MethodGet, Path: "/api/system/login-log/:id", Handler: h.loginLogDetail},

		{Method: http.MethodGet, Path: "/api/system/oper-log/page", Handler: h.operLogPage},
		{Method: http.MethodDelete, Path: "/api/system/oper-log/clear", Handler: h.clearOperLogs},
		{Method: http.MethodPost, Path: "/api/system/oper-log/batch-delete", Handler: h.batchDeleteOperLogs},
		{Method: http.MethodGet, Path: "/api/system/oper-log/:id", Handler: h.operLogDetail},
	})
}
