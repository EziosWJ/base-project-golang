# ADR-0013：业务 API 统一使用 /api/v1 前缀

Status: accepted（已实施）

本 ADR 替代 [ADR-0002](0002-go-api-replaces-java-with-compatible-contract.md) 中“迁移期间保留既有 `/api/**` 路径”的兼容条款；ADR-0002 的其余业务契约与历史背景继续有效。

Go 后端在替代 Java `system-api` 期间保留了未版本化的 `/api/auth`、`/api/system` 和 `/api/public` 路径，以降低前端迁移风险。Java 参考后端已删除，兼容期结束，继续维护未版本化路径与新 `/api/v1` 路径会使路由、Swagger、上传防护和前端调用出现两套事实来源。因此所有业务 API 统一使用 `/api/v1/...`：

- 认证：`/api/v1/auth/*`
- 系统管理：`/api/v1/system/*`
- 公开公告：`/api/v1/public/*`
- 服务器监控：`/api/v1/monitoring/*`

统一入口创建 `/api/v1` 路由组，各业务模块基于传入路由组注册相对路径，不在模块内硬编码完整前缀。旧未版本化业务路由、路径别名、兼容转发和双路由一并删除，不保留重定向。`/health`、`/ready`、`/metrics` 与开发环境 Swagger 入口保持既有职责和路径。

本次变更只统一路径：HTTP 方法、请求参数、响应结构、分页格式、业务错误码和鉴权语义保持不变。上传防护按注册后的完整路径登记，继续限制请求体、文件数量与文件大小。

文件管理生成的 `access_url` 改为 `/api/v1/system/file/{id}/view`。存量数据通过版本化 Goose migration 在 PostgreSQL 与 SQLite 两套 schema 流中做等价转换；迁移只改写本服务生成的规范旧路径，保留文件内容、资源 ID 与其他元数据。已有文件通过新路径访问，不依赖旧路由。

前端集中维护 `/api/v1` 前缀，环境配置中的服务地址只表示 API 源，不包含版本前缀；开发环境直连 API 源，生产环境同源部署。Swagger 文档与契约测试同步更新，旧路径在访问时返回 API 404，不回落为 SPA 页面。

不采用的做法：保留旧路径别名或反向代理重写以延长兼容期；按客户端版本分发不同前缀；同时在模块内硬编码 `/api/v1` 和旧前缀。
