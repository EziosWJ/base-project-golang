package dictconfig

import (
	"net/http"

	"github.com/EziosWJ/base-project-golang/base-go-api/internal/svc"
	"github.com/zeromicro/go-zero/rest"
)

// Register adds all dictionary and system configuration routes to the server.
// The main service can call this function without importing any module internals.
func Register(server *rest.Server, ctx *svc.ServiceContext) {
	h := NewHandler(ctx)
	server.AddRoutes([]rest.Route{
		{Method: http.MethodGet, Path: "/api/system/dict-type/page", Handler: h.dictTypePage},
		{Method: http.MethodGet, Path: "/api/system/dict-type/:id", Handler: h.dictTypeDetail},
		{Method: http.MethodPost, Path: "/api/system/dict-type", Handler: h.createDictType},
		{Method: http.MethodPut, Path: "/api/system/dict-type/:id", Handler: h.updateDictType},
		{Method: http.MethodDelete, Path: "/api/system/dict-type/:id", Handler: h.deleteDictType},
		{Method: http.MethodPost, Path: "/api/system/dict-type/batch-delete", Handler: h.batchDeleteDictTypes},
		{Method: http.MethodPatch, Path: "/api/system/dict-type/:id/status", Handler: h.updateDictTypeStatus},

		{Method: http.MethodGet, Path: "/api/system/dict-data/page", Handler: h.dictDataPage},
		{Method: http.MethodGet, Path: "/api/system/dict-data/:id", Handler: h.dictDataDetail},
		{Method: http.MethodPost, Path: "/api/system/dict-data", Handler: h.createDictData},
		{Method: http.MethodPut, Path: "/api/system/dict-data/:id", Handler: h.updateDictData},
		{Method: http.MethodDelete, Path: "/api/system/dict-data/:id", Handler: h.deleteDictData},
		{Method: http.MethodPost, Path: "/api/system/dict-data/batch-delete", Handler: h.batchDeleteDictData},

		{Method: http.MethodGet, Path: "/api/system/dict/:dictCode/items", Handler: h.dictItems},

		{Method: http.MethodGet, Path: "/api/system/config/page", Handler: h.configPage},
		{Method: http.MethodGet, Path: "/api/system/config/:id", Handler: h.configDetail},
		{Method: http.MethodGet, Path: "/api/system/config/key/:configKey", Handler: h.configByKey},
		{Method: http.MethodPost, Path: "/api/system/config", Handler: h.createConfig},
		{Method: http.MethodPut, Path: "/api/system/config/:id", Handler: h.updateConfig},
		{Method: http.MethodDelete, Path: "/api/system/config/:id", Handler: h.deleteConfig},
		{Method: http.MethodPost, Path: "/api/system/config/batch-delete", Handler: h.batchDeleteConfigs},
		{Method: http.MethodPatch, Path: "/api/system/config/:id/status", Handler: h.updateConfigStatus},
	})
}
