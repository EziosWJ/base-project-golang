# Base Go Admin · 顶部导航模板

`template/topnav` 分支的管理后台前端。采用 React 19 + Ant Design 6 + 顶部导航布局，并已接入同仓库的 Go API。登录、会话恢复、菜单权限以及系统管理模块均使用真实接口。

> 来源纯前端模板 `html/template/react-topnav-template` 保持原定位；本目录是在目标分支中改造后的版本。

## 功能概览

- **顶部导航**：sticky 单行三段式布局；一级导航由后端菜单树驱动，目录使用下拉子菜单。
- **响应式导航**：窄屏隐藏横向菜单，使用汉堡按钮打开 Drawer；Drawer 内保留品牌、搜索和主题切换。
- **命令搜索**：点击搜索按钮、`Ctrl+K` 或 macOS `⌘K` 打开；支持方向键选择、Enter 跳转、Esc 关闭；只展示当前账号可访问且可实际跳转的页面。
- **主题系统**：首次访问跟随操作系统，手动切换后保存到 `localStorage`。
- **认证**：用户名/密码登录、Bearer 令牌、登录恢复、401 失效跳转、退出清理缓存。
- **系统管理**：用户、角色、菜单、部门、字典、配置、文件、登录日志、操作日志。
- **消息**：站内通知、公告、通知管理、公告管理（管理员）；通过 SSE 实时刷新未读数与列表，连接断开自动重连。
- **监控**：服务器资源快照与短期趋势图。
- **个人账号**：个人中心、修改密码、头像地址。
- **页面示例**：保留后端种子菜单中的表单、列表、树、左树右表、详情、浏览选择、单据弹窗示例。
- 本模板**不包含应用内页面标签栏**。

## 技术栈

- React 19、TypeScript、Vite、pnpm
- Ant Design 6 + CSS Modules + Design Token
- React Router Data Router（页面懒加载）
- TanStack Query 5、Zustand 5
- Axios（统一响应解析、业务错误与分页转换）
- Ant Design Charts、Day.js
- Vitest + React Testing Library；MSW 仅用于测试

## 环境要求

- Node.js `>= 22.12.0`
- pnpm `>= 10`
- 可运行的 Go API（默认 `http://127.0.0.1:8150`）

## 安装与启动

```bash
# 仓库根目录
task deps          # pnpm install --frozen-lockfile
task init          # 生成 base-go-api/configs/config.dev.yaml，默认 PostgreSQL
task dev           # migration + Go API(:8150) + 前端(:5173)
```

或使用 SQLite：

```bash
task init -- --database sqlite
task dev:sqlite
```

只启动前端：

```bash
task web
# 或
pnpm dev
```

开发服务器把 `/api` 代理到 `VITE_API_PROXY_TARGET`（默认 `http://127.0.0.1:8150`）。并行联调时无需改默认端口：

```bash
APP_HTTP__ADDRESS=:8100 task api:sqlite
VITE_API_PROXY_TARGET=http://127.0.0.1:8100 pnpm dev --port 5174
```

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务器（真实后端，MSW 默认关闭） |
| `pnpm build` | TypeScript 项目检查并构建生产静态资源 |
| `pnpm preview` | 预览生产构建 |
| `pnpm lint` | 运行 ESLint（含 `eslint-plugin-jsx-a11y`） |
| `pnpm typecheck` | 执行 TypeScript 项目检查 |
| `pnpm test` | 运行 Vitest 测试 |
| `pnpm test:coverage` | 生成 `coverage/` 覆盖率报告 |

根目录对应任务：`task frontend:lint`、`task frontend:typecheck`、`task frontend:test`、`task frontend:build`。

## 环境变量

变量集中读取于 `src/config/env.ts`。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_BASE_PATH` | `/` | 部署基路径，支持子路径部署 |
| `VITE_API_BASE_URL` | `/api/v1` | 完整 API 前缀；同源部署留空即可 |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:8150` | Vite 开发服务器 `/api` 代理目标 |

浏览器端不启用 MSW：开发和生产的默认数据源都是 Go API。测试通过 `src/mocks/server.ts` 使用 MSW。

## 接口约定

- 统一响应：`{ code, message, data }`，业务成功 `code=200`；HTTP 200 也可能是业务失败。
- 分页：后端返回 `{ records, total, page, pageSize }`，前端在 API 边界转换为 `items`。
- 认证：`Authorization: Bearer <tokenValue>`；登录结果包含 `tokenName/tokenValue/expiresIn`。
- 401（HTTP 或业务 code）统一清空会话并跳转 `/login?redirect=...`。
- 实时消息使用 SSE：登录布局订阅 `/api/v1/system/notification/events`，同时覆盖通知与站内公告变更；事件只作为刷新提示，内容仍以分页接口为准。公开公告流 `/api/v1/public/announcement/events` 留给未登录场景，登录布局不重复订阅。
- 登录、退出、账号切换会清空 TanStack Query 缓存，避免不同账号数据混用。

代码位置：

```text
src/lib/api/client.ts      # Axios、信封解析、分页转换、401 通知
src/lib/api/errors.ts      # 错误分类与字段错误
src/features/auth/         # 登录、当前用户、菜单、Zustand 会话
src/features/system/       # 系统管理接口
src/features/notifications/ # 通知接口与 SSE（/system/notification/events）
src/features/announcements/ # 公告接口（公开流 /public/announcement/events）
src/features/monitoring/    # 监控接口
```

## 菜单与权限映射

本地页面注册在 `src/config/routes.tsx`，后端菜单优先按 `permissionCode`、其次按 `path` 映射：

| 后端 permissionCode | 本地路由 |
| --- | --- |
| `system:user` | `/system/user` |
| `system:role` | `/system/role` |
| `system:menu` | `/system/menu` |
| `system:dept` | `/system/dept` |
| `system:dict` | `/system/dict` |
| `system:config` | `/system/config` |
| `system:file` | `/system/file` |
| `system:login-log` | `/system/login-log` |
| `system:oper-log` | `/system/oper-log` |
| `monitor:server` | `/monitor/server` |
| `examples:*` | `/forms/basic`、`/examples/*` |

- 未在本地注册的后端菜单会自动隐藏，避免出现“菜单可见但页面打不开”。
- 顶部导航、移动 Drawer、面包屑、命令搜索和直接访问共用同一份映射与访问判断。
- 工作台、我的通知、公告、个人中心是 `authenticatedOnly` 本地入口；通知管理、公告管理是 `adminOnly` 入口（前端显隐；服务端仍执行既有授权规则）。
- 直接访问无权限页面显示 403，未知路径显示 404。

## 单二进制发布

前端先构建，再由 Go `embedweb` 内嵌：

```bash
# 仓库根目录
task deps
task build
# 产物：bin/base-go-api、bin/base-go-migrate、bin/base-go-backup 等
```

`task build:check` 使用 `embedweb` 标签运行后端测试与 vet。SPA 刷新、未知 API 和缺失静态资源由 `internal/webui` 处理。

## 目录结构

```text
src/
├── app/            # Providers、路由、会话启动
├── components/     # 通用 UI、鉴权包装、命令面板、DataTable
├── config/         # 环境、品牌、路由、导航映射、选项、文案
├── features/       # auth、system、notifications、announcements、monitoring
├── hooks/          # URL 列表状态、标题、快捷键等
├── layouts/        # 顶部导航布局
├── lib/            # API 客户端、错误、权限访问、查询键
├── mocks/          # 测试用 MSW server
├── pages/          # 登录、工作台、系统页面、通知公告、监控、示例
├── styles/         # 主题与全局样式
├── types/          # API 与领域类型
└── utils/          # 格式化、导出、下载、主题
tests/              # Vitest + RTL
```

## 测试

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

测试覆盖环境解析、响应信封与错误分类、分页转换、菜单映射/访问规则、登录成功与失败、顶部导航与命令搜索、DataTable、格式化等关键行为。纯样式调整不单独堆测试。

`tests/notification-capacity.mjs` 由后端集成契约调用：它启动 Vite + Chromium，确认高并发 SSE 连接下通知列表能在 2 秒内刷新。首次本地运行前如缺少浏览器，执行 `pnpm exec playwright install chromium`；CI 在集成测试前会自动安装。
