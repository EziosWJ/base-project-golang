# base-go-api 本地开发与调试

`base-go-api` 是基于 Go、Gin、GORM 和 PostgreSQL 的 REST API。数据库结构与内置数据由独立的 Goose migration 管理；API 启动时不会执行 migration 或 GORM `AutoMigrate()`。

## 前置条件

- Go 1.26（与 `go.mod` 保持一致）
- Docker 与 Docker Compose（运行本地 PostgreSQL、Docker Compose 开发模式及集成测试）
- 使用 VS Code 调试时，安装官方 Go 扩展

## 配置说明

应用按以下顺序加载配置，后者覆盖前者：

```text
默认值
→ configs/config.yaml
→ configs/config.{APP_ENV}.yaml
→ APP_ 环境变量
```

`APP_ENV` 只能通过进程环境变量指定，支持 `dev`、`test`、`prod`，未设置时默认为 `dev`。因此本地开发读取 `configs/config.yaml` 和 `configs/config.dev.yaml`。

数据库与 JWT 可以配置在 YAML 中。本机直接运行或 IDE 调试前，确认 `configs/config.dev.yaml` 中的值正确：

```yaml
database:
  url: postgres://127.0.0.1:54329/base_go_api?sslmode=disable
  username: base_go_api
  password: your-local-password

jwt:
  secret: a-random-local-development-secret
```

`database.url` 只能包含数据库地址、数据库名和连接参数，不能包含用户名或密码；应用会使用 `username`、`password` 生成最终的 PostgreSQL 连接串。

`.env` 只由 Docker Compose 读取，Go 程序不会自动加载它。直接执行 `go run` 或通过 VS Code 调试时，应使用 YAML 配置或在启动配置中显式注入环境变量。

## 方式一：Docker Compose 一键启动

此方式同时运行 PostgreSQL、一次性 migration 容器和 API 容器，适合不需要断点调试时使用。

```zsh
cd base-go-api
cp .env.example .env
# 编辑 .env：至少替换 POSTGRES_PASSWORD 和 APP_JWT__SECRET
docker compose -f docker-compose.dev.yml up --build
```

Compose 按以下顺序启动：`postgres`（健康检查通过）→ `migrate`（成功后退出）→ `api`。其中 Compose 会把 `.env` 中的 PostgreSQL 与 JWT 值覆盖到容器内应用配置，因此无需为该方式修改 `config.dev.yaml`。

启动后可访问：

- API：<http://127.0.0.1:8080>
- Swagger：<http://127.0.0.1:8080/swagger/index.html>
- 存活检查：`curl http://127.0.0.1:8080/health`
- 数据库就绪检查：`curl http://127.0.0.1:8080/ready`

首次 migration 会写入内置管理员账号 `admin / admin123`，仅供本地开发使用。

停止容器但保留本地数据：

```zsh
docker compose -f docker-compose.dev.yml down
```

确实需要重建本机开发数据库时，再删除命名卷：

```zsh
docker volume rm base_go_api_postgres_data
```

## 方式二：VS Code 断点调试

此方式只用 Docker 运行 PostgreSQL，API 与 migration 由本机 Go 调试器启动。请勿同时运行 Compose 的 `api` 服务，否则会占用本机 `8080` 端口。

### 1. 准备配置和数据库

创建 `.env` 并设置本地数据库密码：

```zsh
cd base-go-api
cp .env.example .env
```

将 `configs/config.dev.yaml` 的 `database.password` 改为与 `.env` 中 `POSTGRES_PASSWORD` 相同的值，并设置本机 JWT 密钥。然后只启动 PostgreSQL：

```zsh
docker compose -f docker-compose.dev.yml up -d --wait postgres
```

### 2. 在 VS Code 执行 migration

仓库根目录的 [`.vscode/launch.json`](../.vscode/launch.json) 已提供以下调试配置：

- `Go Migration (dev)`：等价于 `APP_ENV=dev go run ./cmd/migrate up --kind all`；
- `Go API (dev)`：等价于 `APP_ENV=dev go run ./cmd/api`。

在“运行和调试”面板先选择 `Go Migration (dev)` 并按 `F5`。该任务是一次性执行，成功后会自动结束；新增或修改 migration 后也应重新执行一次。

### 3. 启动并调试 API

选择 `Go API (dev)` 并按 `F5`，即可在 Go 代码中设置断点。启动成功后使用上述 `/health`、`/ready` 或 Swagger 地址验证服务。

不使用 VS Code 时，可在 `base-go-api` 目录执行相同命令：

```zsh
APP_ENV=dev go run ./cmd/migrate up --kind all
APP_ENV=dev go run ./cmd/api
```

## 测试

运行普通单元测试：

```zsh
cd base-go-api
GOCACHE=/tmp/base-go-api-build go test ./...
```

运行 PostgreSQL 集成测试。测试会启动随机名称和随机本机端口的临时 PostgreSQL 容器，不读取工作区开发数据库配置：

```zsh
cd base-go-api
GOCACHE=/tmp/base-go-api-build go test -tags=integration ./integration
```

集成测试需要 Docker daemon 可用，会执行 migration 并检查 Goose 版本表。
