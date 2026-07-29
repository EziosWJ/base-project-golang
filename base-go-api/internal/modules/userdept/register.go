package userdept

import (
	"net/http"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/svc"
	"github.com/zeromicro/go-zero/rest"
)

func Register(server *rest.Server, ctx *svc.ServiceContext) {
	h := &handler{service: newService(ctx)}
	server.AddRoutes([]rest.Route{
		{Method: http.MethodGet, Path: "/tree", Handler: h.deptTree},
		{Method: http.MethodGet, Path: "/options", Handler: h.deptOptions},
		{Method: http.MethodGet, Path: "/page", Handler: h.deptPage},
		{Method: http.MethodPost, Path: "/", Handler: h.createDept},
		{Method: http.MethodPost, Path: "/batch-delete", Handler: h.batchDeleteDept},
		{Method: http.MethodGet, Path: "/:id", Handler: h.deptDetail},
		{Method: http.MethodPut, Path: "/:id", Handler: h.updateDept},
		{Method: http.MethodDelete, Path: "/:id", Handler: h.deleteDept},
		{Method: http.MethodPatch, Path: "/:id/status", Handler: h.updateDeptStatus},
	}, rest.WithPrefix("/api/system/dept"))
	server.AddRoutes([]rest.Route{
		{Method: http.MethodGet, Path: "/page", Handler: h.userPage},
		{Method: http.MethodPost, Path: "/", Handler: h.createUser},
		{Method: http.MethodPost, Path: "/batch-delete", Handler: h.batchDeleteUser},
		{Method: http.MethodPut, Path: "/me/password", Handler: h.changeCurrentPassword},
		{Method: http.MethodPut, Path: "/me/avatar", Handler: h.updateCurrentAvatar},
		{Method: http.MethodGet, Path: "/:id", Handler: h.userDetail},
		{Method: http.MethodPut, Path: "/:id", Handler: h.updateUser},
		{Method: http.MethodDelete, Path: "/:id", Handler: h.deleteUser},
		{Method: http.MethodPatch, Path: "/:id/status", Handler: h.updateUserStatus},
		{Method: http.MethodPut, Path: "/:id/roles", Handler: h.assignUserRoles},
		{Method: http.MethodPut, Path: "/:id/reset-password", Handler: h.resetUserPassword},
	}, rest.WithPrefix("/api/system/user"))
}
