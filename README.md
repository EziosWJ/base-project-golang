# base-project-java

React 管理后台 + Go REST API 的 monorepo。

## 目录结构

```
├── react-admin/   # 前端管理后台（React SPA）
├── base-go-api/   # 后端 REST API（Go）
├── docs/
│   ├── adr/       # 架构决策记录
│   └── agents/    # Agent skills 仓库级配置
├── CONTEXT.md     # 领域术语与架构上下文
└── task/          # 任务上下文
```

## 技术栈

**前端 `react-admin/`**
React 19 · TypeScript · Vite 6 · Tailwind CSS · shadcn/ui · react-router-dom v7 · Zustand · react-hook-form + zod

**后端 `base-go-api/`**
Go 1.26 · Gin · GORM · PostgreSQL · Goose migration · Koanf 配置 · JWT 认证 · Prometheus · Swagger

## 快速开始

### 后端

两种方式任选其一，详见 [base-go-api/README.md](base-go-api/README.md)。

**方式一：Docker Compose 一键启动**（PostgreSQL + migration + API）

```zsh
cd base-go-api
cp .env.example .env
# 编辑 .env：替换 POSTGRES_PASSWORD 与 APP_JWT__SECRET
docker compose -f docker-compose.dev.yml up --build
```

启动后访问 <http://127.0.0.1:8080>，Swagger 在 <http://127.0.0.1:8080/swagger/index.html>。首次 migration 写入内置管理员 `admin / admin123`（仅本地开发）。

**方式二：本机运行 + VS Code 断点调试**

```zsh
cd base-go-api
cp configs/config.dev.example.yaml configs/config.dev.yaml
# 编辑 configs/config.dev.yaml：替换 database.username/password 与 jwt.secret
docker compose -f docker-compose.dev.yml up -d --wait postgres
APP_ENV=dev go run ./cmd/migrate up --kind all
APP_ENV=dev go run ./cmd/api
```

后端默认监听 `:8099`。测试：`go test ./...`，集成测试 `go test -tags=integration ./integration`（需 Docker）。

### 前端

```zsh
cd react-admin
npm install
npm run dev   # 默认 http://localhost:5173
```

前端通过 `VITE_API_BASE_URL` 指定后端地址（默认同源相对路径）；开发时可在 `.env.local` 中设置为 `http://127.0.0.1:8099`。

## 文档

- 后端启动与调试细节：[base-go-api/README.md](base-go-api/README.md)
- 领域术语与架构约定：[CONTEXT.md](CONTEXT.md)
- 架构决策：[docs/adr/](docs/adr/)
