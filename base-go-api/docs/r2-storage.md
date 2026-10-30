# Cloudflare R2 文件存储

文件仍由浏览器上传到 Go API，由 API 写入本地目录或私有 R2 Bucket。使用 AWS 官方 Go SDK v2 调用 R2 的 S3 接口和生成签名链接，无需开放 Bucket 公共访问。

## 配置

在实际环境的 `configs/config.dev.yaml` 或 `configs/config.prod.yaml` 中合并以下配置，不要提交真实凭据：

```yaml
file:
  default_storage: local
  # 与上传表单的 businessModule 精确匹配；未匹配或未填写时使用默认存储。
  business_storage:
    avatar: local
    documents: s3
  s3:
    endpoint: https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
    bucket: YOUR_PRIVATE_BUCKET
    access_key_id: YOUR_R2_ACCESS_KEY_ID
    secret_access_key: YOUR_R2_SECRET_ACCESS_KEY
    presign_ttl: 5m
```

`default_storage` 和业务映射只接受 `local` / `s3`。改为 `default_storage: s3` 可使未显式映射的业务上传到 R2；`avatar: local` 保持头像本地存储。首次配置前默认仍为本地上传。业务模块字段是存储路由标签，不是权限边界，客户端不能选择任意 Bucket 或对象 Key。

Endpoint 使用 R2 S3 API 地址，不使用 `r2.dev` 或自定义公开域名；Region 固定为 `auto`。R2 S3 凭据需要对应 Bucket 的对象读写权限，包括上传失败补偿所需的删除权限。临时链接默认 5 分钟，允许 1 秒至 7 天。配置错误会阻止启动；修改配置后重启 API。

可通过 `APP_FILE__S3__ACCESS_KEY_ID`、`APP_FILE__S3__SECRET_ACCESS_KEY` 等环境变量覆盖文件配置。不要把 R2 凭据放入前端环境变量。

## 数据库与启动

在仓库根目录执行：

```bash
task db:migrate
task api
```

SQLite 对应执行 `task db:migrate:sqlite`、`task api:sqlite`。新增 schema migration 00011 在两种数据库中增加 `sys_file.storage_type`，记录上传时实际使用的存储，不执行历史文件内容迁移。

业务映射只决定新文件的去向。更改默认存储、业务映射或文件业务模块不会搬移已有对象，也不会改变其读取位置。已存在 S3 文件时，保留对应 R2 Endpoint、Bucket 和凭据，不要将同一配置直接指向另一个 Bucket。

## 下载与预览

- `accessUrl` 继续保存稳定的 `/api/v1/system/file/{id}/view` 地址，不持久化临时链接。
- 鉴权接口 `GET /api/v1/system/file/{id}/access-url?disposition=inline` 返回 `{url, direct}`；下载时使用 `disposition=attachment`。
- R2 返回临时链接且 `direct=true`，预览直接交给图片或 PDF 元素展示，不再先 fetch 再转 Blob。图片加载失败时展示错误或头像占位。本地返回原流接口地址且 `direct=false`，继续使用鉴权请求获取 Blob；取链接时只查询元数据，不打开物理文件。
- 下载保留现有 Blob 下载行为；读取 R2 内容的请求不携带系统 Bearer Token。
- 原 `/view` 和 `/download` 对 R2 返回 302，本地继续返回内容。浏览器页面优先使用取链接接口，避免跨多个源跟随重定向。
- 链接包含签名后的文件名、内容类型和下载/预览方式，接口与 R2 内容均禁止缓存。

当前下载通过 fetch 读取 R2 内容，因此 Bucket 需要设置允许管理页面来源的 CORS。普通图片直接展示无需该 CORS 配置。按实际前端地址替换：

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "http://127.0.0.1:5173", "https://admin.example.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Disposition", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

上传由后端执行，CORS 无需允许浏览器 PUT。前端和 API 同源部署时，下载中的 R2 fetch 仍需要该配置。

## 生命周期与验证

限制保持为单文件 50 MiB、批次 20 个文件 / 200 MiB。R2 上传使用有大小上限的临时文件，不将整个文件保存在内存。R2 转存包含在上传请求耗时内；网络较慢时按实际需要调整 `http.write_timeout`（基础配置为 15 秒）。元数据或审计事务失败时，尝试删除本次上传的对象；补偿失败记录日志。

删除和批量删除仍只软删除元数据，不删除 R2 对象。删除后不再签发新链接；已签发链接在过期前仍然可用。本次没有增加公开访问、分片上传或历史文件迁移。

配置真实 R2 后，可上传 `businessModule=documents` 的文件，确认 Bucket 中出现对象；在文件管理中预览、下载，再软删除并确认对象仍在 Bucket 中。单元测试使用内存 HTTP transport 验证 SDK 请求和签名，不访问真实云服务。`task frontend:files` 使用浏览器 mock 验证本地/R2 下载预览以及凭据隔离。

官方参考：[R2 Go SDK 示例](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-go/)、[预签名链接](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)、[Bucket CORS](https://developers.cloudflare.com/r2/buckets/cors/)。
