# base-go-api 开发运行

Go API 使用 PostgreSQL 作为首发数据库。开发 Compose 创建的是专用本机数据库，不会连接部署数据库。

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

## PostgreSQL 集成测试

集成测试不会读取或使用 `APP_DATABASE__DSN`。它通过 Docker 启动带随机名称和随机本机端口的 PostgreSQL 17 容器，再把临时 DSN 仅传给 migration 子进程。

```zsh
cd base-go-api
GOCACHE=/tmp/base-go-api-build go test -tags=integration ./integration
```

测试需要 Docker daemon 可用。当前 migration 命令尚未接入时，测试会跳过；`cmd/migrate` 落地后会执行 migration 并检查 Goose 版本表。
