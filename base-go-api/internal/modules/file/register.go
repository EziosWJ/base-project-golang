package file

import (
	"net/http"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/svc"
	"github.com/zeromicro/go-zero/rest"
)

// Register adds all local file management routes to the REST server.
func Register(server *rest.Server, ctx *svc.ServiceContext) {
	h := NewHandler(NewService(ctx))
	server.AddRoutes([]rest.Route{
		{Method: http.MethodPost, Path: "/upload", Handler: h.upload},
		{Method: http.MethodPost, Path: "/upload-batch", Handler: h.uploadBatch},
		{Method: http.MethodGet, Path: "/page", Handler: h.page},
		{Method: http.MethodGet, Path: "/:id", Handler: h.detail},
		{Method: http.MethodPut, Path: "/:id", Handler: h.update},
		{Method: http.MethodDelete, Path: "/:id", Handler: h.delete},
		{Method: http.MethodPost, Path: "/batch-delete", Handler: h.batchDelete},
		{Method: http.MethodPatch, Path: "/:id/status", Handler: h.updateStatus},
		{Method: http.MethodGet, Path: "/:id/download", Handler: h.download},
		{Method: http.MethodGet, Path: "/:id/view", Handler: h.view},
	}, rest.WithPrefix("/api/system/file"))
}
