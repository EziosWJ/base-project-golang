# Go 后端采用 go-zero 单体 REST 服务

Status: accepted

`base-go-api/` 使用 go-zero 构建单体 REST 服务，以 `.api` 文件维护既有 HTTP 契约，并使用 `goctl` 生成路由、类型和业务骨架。服务使用 PostgreSQL 17 和版本化 SQL migration；本次不引入 zRPC、服务发现、消息队列、微服务拆分或未被证实需要的 Redis model 缓存，以保持后端迁移的实现范围可控。
