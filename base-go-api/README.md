# base-go-api 开发运行

Go API 使用 PostgreSQL 作为首发数据库。开发 Compose 创建的是专用本机数据库，不会连接部署数据库。应用配置按 `config.yaml`、`config.{APP_ENV}.yaml`、`APP_` 环境变量的顺序覆盖；数据库 URL、用户名、密码和 JWT 密钥都可以写在 YAML 中，环境变量仅作为覆盖方式。

## 启动开发环境

```zsh
cd base-go-api
cp .env.example .env
# 编辑 .env，替换 POSTGRES_PASSWORD 与 APP_JWT__SECRET
docker compose -f docker-compose.dev.yml up --build
```

启动顺序固定为 `postgres`（健康检查成功）→ `migrate`（一次性成功退出）→ `api`。PostgreSQL 仅绑定 `127.0.0.1`，命名卷为 `base_go_api_postgres_data`。开发服务地址为 `http://127.0.0.1:8080`（可通过 `API_PORT` 修改）。

停止容器但保留本地开发数据：

```zsh
docker compose -f docker-compose.dev.yml down
```

若确实需要重建本地开发数据库，再显式删除命名卷：

```zsh
docker volume rm base_go_api_postgres_data
```

`migrate` 是一次性容器：它显式执行 `migrate up --kind all`，按顺序应用 Goose schema 和 seed migration；API 进程不会执行 migration 或 GORM AutoMigrate。

## YAML 数据库配置

本机直接运行 `go run ./cmd/api` 或通过 IDE 调试时，编辑 `configs/config.dev.yaml`：

```yaml
database:
  url: postgres://127.0.0.1:54329/base_go_api?sslmode=disable
  username: base_go_api
  password: your-local-password

jwt:
  secret: a-random-local-development-secret
```

`database.url` 必须不含用户名和密码；程序会将 `username`、`password` 合成为 PostgreSQL 连接串。Docker Compose 会使用 `.env` 中的 `POSTGRES_*` 和 `APP_JWT__SECRET` 覆盖这些 YAML 值，以便不修改工作区配置即可启动容器。

## PostgreSQL 集成测试

集成测试不会读取工作区数据库配置。它通过 Docker 启动带随机名称和随机本机端口的 PostgreSQL 17 容器，再把临时数据库配置仅传给 migration 子进程。

```zsh
cd base-go-api
GOCACHE=/tmp/base-go-api-build go test -tags=integration ./integration
```

测试需要 Docker daemon 可用。当前 migration 命令尚未接入时，测试会跳过；`cmd/migrate` 落地后会执行 migration 并检查 Goose 版本表。
