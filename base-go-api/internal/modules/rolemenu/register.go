package rolemenu

import (
	"net/http"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/svc"
	"github.com/zeromicro/go-zero/rest"
)

func Register(server *rest.Server, ctx *svc.ServiceContext) {
	h := &handler{db: ctx.DB}
	server.AddRoutes([]rest.Route{
		{Method: http.MethodGet, Path: "/page", Handler: h.rolePage}, {Method: http.MethodGet, Path: "/options", Handler: h.roleOptions}, {Method: http.MethodPost, Path: "/", Handler: h.createRole}, {Method: http.MethodPost, Path: "/batch-delete", Handler: h.roleBatchDelete},
		{Method: http.MethodGet, Path: "/:id", Handler: h.roleDetail}, {Method: http.MethodPut, Path: "/:id", Handler: h.updateRole}, {Method: http.MethodDelete, Path: "/:id", Handler: h.deleteRole}, {Method: http.MethodPatch, Path: "/:id/status", Handler: h.roleStatus}, {Method: http.MethodPut, Path: "/:id/menus", Handler: h.assignMenus},
	}, rest.WithPrefix("/api/system/role"))
	server.AddRoutes([]rest.Route{
		{Method: http.MethodGet, Path: "/tree", Handler: h.menuTree}, {Method: http.MethodGet, Path: "/page", Handler: h.menuPage}, {Method: http.MethodPost, Path: "/", Handler: h.createMenu}, {Method: http.MethodPost, Path: "/batch-delete", Handler: h.menuBatchDelete},
		{Method: http.MethodGet, Path: "/:id", Handler: h.menuDetail}, {Method: http.MethodPut, Path: "/:id", Handler: h.updateMenu}, {Method: http.MethodDelete, Path: "/:id", Handler: h.deleteMenu}, {Method: http.MethodPatch, Path: "/:id/status", Handler: h.menuStatus},
	}, rest.WithPrefix("/api/system/menu"))
}
