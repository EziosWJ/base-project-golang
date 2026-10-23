# base-project-golang

React 管理后台 + Go REST API 的 monorepo。当前 `template/sidebar` 分支使用 Ant Design 侧边栏前端接入真实后端，可作为完整系统管理脚手架独立开发、验证和发布。

## 目录结构

```
├── react-admin/   # 前端管理后台（React + Ant Design SPA）
├── base-go-api/   # 后端 REST API（Go）
├── docs/
│   ├── adr/       # 架构决策记录
│   └── agents/    # Agent skills 仓库级配置
├── CONTEXT.md     # 领域术语与架构上下文
└── task/          # 任务上下文
```

## 技术栈

**前端 `react-admin/`**
React 19 · TypeScript · Vite 7 · Ant Design 6 · CSS Modules · react-router-dom v7 · TanStack Query · Axios · Zustand · pnpm

**后端 `base-go-api/`**
Go 1.26 · Gin · GORM · PostgreSQL/SQLite · Goose migration · Koanf 配置 · JWT 认证 · Prometheus · Swagger

前后端契约统一为 `/api/v1`，响应结构为 `{ code, message, data }`，分页字段为 `records`。前端在数据访问层完成响应解包、业务码检查、401 处理和 `records → items` 转换。

## 内嵌前端的单二进制发布

在仓库根目录安装前端构建依赖并构建：

```bash
pnpm --dir react-admin install --frozen-lockfile
task build
```

产物为 `bin/base-go-api`、`bin/base-go-migrate` 和 `bin/base-go-backup`（Windows 下使用对应的 `.exe` 后缀）。API 通过 Go `embed` 内嵌 React 生产构建，同时提供管理页面与 REST API；部署时无需 `react-admin/dist`、Node.js 或单独的静态文件服务。

沿用既有配置和显式 migration 流程，在 `base-go-api` 目录执行 `../bin/base-go-migrate up --kind all` 后启动 `../bin/base-go-api`，默认访问 `http://localhost:8100`。直接访问和刷新管理页面均支持，未知 API 和缺失静态文件仍返回 JSON 404。生产环境设置 `APP_ENV=prod`；配置、数据库、可写上传目录仍需提供，migration 工具还需要 `migrations/`，详见 [后端部署说明](base-go-api/README.md)。

`task build:check` 构建发布产物并执行带 `embedweb` 标签的测试和 vet。日常 `task api` 保持 API 开发模式，配合 `task web` 的 Vite 服务使用。Docker Compose 构建的 API 镜像也内嵌前端。

## 快速开始

### 使用 Task（推荐）

项目根目录提供跨平台的 `Taskfile.yml`。准备 Go 1.26+、Node.js 22.12+、pnpm 10、Task 和可供 CGO 使用的 C 编译器后，初始化本地开发环境：

```bash
task frontend:install
task init
# 编辑 base-go-api/configs/config.dev.yaml：填写 PostgreSQL 地址、用户名与密码
# 在 PostgreSQL 中准备对应数据库后：
task doctor
task dev
```

`task init` 默认选择 PostgreSQL，从开发模板生成被 Git 忽略的 `base-go-api/configs/config.dev.yaml`，自动生成随机 JWT 密钥并写入当前项目的绝对上传目录。重复运行时保留已有配置及 JWT。初始化不创建 PostgreSQL 数据库、不启动 Docker、不执行迁移或启动服务；模板中的数据库地址与 `change-me` 凭据需要按本机环境修改。

若希望使用无需外部数据库的 SQLite：

```bash
task init -- --database sqlite
task doctor -- --database sqlite
task dev:sqlite
```

`task doctor` 检查开发工具、前端依赖、有效开发配置和数据库连接；失败时返回非零退出状态，并给出隐藏凭据的修复提示。检查保留现有 `APP_` 环境变量覆盖；`--database sqlite` 使用与 SQLite 启动任务一致的 profile。SQLite 文件不存在时提示等待显式迁移，不创建文件；已有 SQLite 文件以只读连接检查，不执行 migration。数据库检查不代表 schema 已更新，后续仍使用 `task dev` 或 `task dev:sqlite` 完成迁移。初始化会保留已有 PostgreSQL 配置，切换 SQLite 可直接使用上述 profile 命令。

日常可在项目根目录执行：

```text
task frontend:install   # pnpm 冻结锁文件安装前端依赖
task init         # 生成本地开发配置，默认 PostgreSQL
task doctor       # 检查开发工具、配置和数据库
task db:migrate   # 恢复或更新数据库
task db:migrate:sqlite # 使用 SQLite profile 迁移数据库
task api          # 启动 Go API（:8100）
task api:sqlite   # 使用 SQLite profile 启动 Go API
task web          # 启动 React（:5173，/api 代理到 :8100）
task dev          # 迁移数据库并同时启动前后端
task dev:sqlite   # 迁移 SQLite 并同时启动前后端
task frontend:lint
task frontend:typecheck
task frontend:test
task frontend:build
task check        # 后端测试/vet + 前端 lint/typecheck/test/build
task test         # 执行后端测试
task dev:setup:test # 执行初始化入口的 Node 命令测试（Go 命令测试包含在后端测试中）
task db:backup -- --source /path/app.db --destination /path/app-backup.db --verify
task db:check     # 后端检查及 PostgreSQL/SQLite 数据库兼容门禁
```

Windows、Linux 和 macOS 使用相同命令；Docker Desktop 仅在运行 Docker 或集成测试时需要。

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
task init   # 在仓库根目录生成 base-go-api/configs/config.dev.yaml（随机 JWT 与本机上传目录）
# 编辑 base-go-api/configs/config.dev.yaml：替换 database.username/password
cd base-go-api
docker compose -f docker-compose.dev.yml up -d --wait postgres
APP_ENV=dev go run ./cmd/migrate up --kind all
APP_ENV=dev go run ./cmd/api
```

后端默认监听 `:8100`。PostgreSQL 为默认数据库；SQLite 可通过 `task db:migrate:sqlite`、`task api:sqlite` 或 `task dev:sqlite` 使用独立 profile 启动，配置、锁降级、备份恢复和边界见 [后端 README](base-go-api/README.md)。测试：`go test ./...`，SQLite 集成测试不需要 Docker，PostgreSQL 集成测试 `go test -tags=integration ./integration` 需要 Docker。

### 前端

```zsh
cd react-admin
pnpm install --frozen-lockfile
pnpm dev   # 默认 http://localhost:5173
```

开发服务器把 `/api` 代理到 `http://127.0.0.1:8100`，因此默认无需配置 CORS。服务器监控菜单只在后端配置 `monitoring.enabled: true` 时由 `/auth/menus` 返回；开发环境可在 `base-go-api/configs/config.dev.yaml` 中开启。也可以在 `react-admin/.env.local` 中设置 `VITE_API_BASE_URL=http://127.0.0.1:8100` 直连 API。生产默认同源部署，保持该变量为空。

前端登录后从 `/api/v1/auth/menus` 获取当前账号菜单，并与 `react-admin/src/config/routes.tsx` 的本地页面注册匹配；未注册组件不会出现在侧边栏，无菜单权限的直接访问显示 403。通知管理、公告管理仅对 `ADMIN` 角色开放，但前端控制不代表服务端授权。

## 文档

- 前端说明：[react-admin/README.md](react-admin/README.md)
- 后端启动与调试细节：[base-go-api/README.md](base-go-api/README.md)
- 侧边栏模板接入决策：[docs/adr/0014-sidebar-template-integration.md](docs/adr/0014-sidebar-template-integration.md)
- 开发初始化设计与验收：[设计](docs/development-initialization.md)、[Spec](docs/development-initialization-spec.md)、[Issue #72](https://github.com/EziosWJ/base-project-golang/issues/72)
- 领域术语与架构约定：[CONTEXT.md](CONTEXT.md)
- 架构决策：[docs/adr/](docs/adr/)
