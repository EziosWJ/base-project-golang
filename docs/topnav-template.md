# 顶部导航模板（template/topnav）

本文记录 `template/topnav` 分支的接入方式、契约与验证约定，便于与 `template/sidebar` 对比和同步。

## 范围

- 前端来源：`html/template/react-topnav-template`（纯前端演示模板，保持只读）。
- 落地位置：本仓库 `react-admin/`，保留 React / Ant Design / CSS Modules / TanStack Query / Axios / Zustand / pnpm。
- 后端：沿用 `base-go-api/`，不修改 Go module 路径和既有接口契约。
- 布局：顶部导航 + 二级下拉 + 窄屏 Drawer + 主题切换 + 全局命令搜索；不添加应用内页面标签栏。
- 业务：登录、当前用户、菜单权限、用户/角色/菜单/部门/字典/配置/文件/日志/通知/公告/服务器监控、个人中心。
- 客户、项目、订单的模拟业务已移除；后端种子中的 7 个页面示例保留为 Ant Design 示例页。

## 前端结构

```text
src/config/routes.tsx      本地页面注册表（path、permissionCode、adminOnly/authenticatedOnly）
src/config/navigation.ts   后端菜单 → 导航/面包屑/命令搜索
src/lib/access.ts          菜单权限集合与路由访问判断
src/lib/api/client.ts      Axios、Bearer、{code,message,data} 解析、records→items、401 通知
src/lib/api/errors.ts      错误分类（business/unauthorized/forbidden/notFound/server/network/timeout）
src/features/auth/store.ts Zustand 会话、登录恢复、退出、查询缓存清理
src/features/*/api.ts      各模块接口封装
src/pages/                 页面
```

## 菜单映射契约

后端 `GET /api/v1/auth/menus` 返回 `DIR/MENU/LINK` 树。前端按以下顺序映射：

1. 目录 `DIR`：递归映射可见子节点，子节点为空则隐藏。
2. 外链 `LINK`：`path` 为 http(s) 时在新标签打开。
3. 菜单 `MENU`：优先按 `permissionCode` 匹配本地路由，其次按 `path`。
4. 未匹配到本地页面的菜单从顶部导航、移动 Drawer 和命令搜索中隐藏（开发环境打印警告）。
5. `visible=0` 的菜单不显示，但已授权时仍允许直接访问对应页面。

| permissionCode | 页面 |
| --- | --- |
| `system:user` / `system:role` / `system:menu` / `system:dept` | 用户 / 角色 / 菜单 / 部门 |
| `system:dict` / `system:config` / `system:file` | 字典 / 配置 / 文件 |
| `system:login-log` / `system:oper-log` | 登录日志 / 操作日志 |
| `monitor:server` | 服务器监控 |
| `examples:form` / `examples:list` / `examples:tree` / `examples:tree-table` | 表单 / 列表 / 树 / 左树右表 Demo |
| `examples:detail` / `examples:browse-picker` / `examples:document-dialog` | 详情 / 浏览选择 / 单据弹窗 Demo |

本地入口：

- `authenticatedOnly`：工作台 `/`、我的通知 `/notifications`、公告 `/announcements`、个人中心、修改密码。
- `adminOnly`：通知管理 `/system/notification`、公告管理 `/system/announcement`（前端按 `ADMIN` 角色显隐；服务端仍执行其既有授权判断）。

直接访问：未授权 → 403；未注册路径 → 404；命令搜索与导航使用同一份结果，避免“搜得到但打不开”。

## API 契约

- 前缀：`/api/v1`；开发时 Vite 将 `/api` 代理到 `VITE_API_PROXY_TARGET`。
- 响应：`{ code, message, data }`；HTTP 200 也检查业务 `code`。
- 分页：`{ records, total, page, pageSize }` 在 `toPageResult` 转为 `{ items, total, page, pageSize }`。
- 认证：`Authorization: Bearer <tokenValue>`；`tokenName` 仅作响应字段保留。
- 401：HTTP 或业务 code 均清空会话、清空 Query 缓存并跳转 `/login?redirect=...`。
- 查询错误最多重试一次（network/timeout/server）；写入不自动重试；页面渲染错误，mutation 只提示一次。
- 服务端字段错误（`data` 为 `Record<string,string>`）通过 `applyServerFieldErrors` 绑定到 Ant Design 表单。
- 登录布局通过 SSE `/api/v1/system/notification/events` 接收通知、已读和站内公告变更提示，事件只触发缓存重取；断线指数退避重连，`pagehide` 主动释放连接。公开流 `/api/v1/public/announcement/events` 不在登录布局重复订阅。

## 会话与数据隔离

- `localStorage` 仅保存 `{token,user}`；菜单每次启动重新获取。
- 启动时 `SessionBootstrap` 校验 token；失败则清空并回到登录页。
- 登录成功、退出、401、账号切换都调用 `queryClient.clear()`，避免不同账号数据混用。
- 不假设存在刷新令牌接口；令牌过期按失效处理。

## 开发与联调

```bash
# 安装前端依赖（冻结锁文件）
task deps

# 默认端口
task init -- --database sqlite
task db:migrate:sqlite
task api:sqlite          # :8150
task web                 # :5173

# 并行联调端口（不改默认值）
APP_HTTP__ADDRESS=:8100 task api:sqlite
VITE_API_PROXY_TARGET=http://127.0.0.1:8100 task web -- --port 5174
```

SQLite 数据库位于 `base-go-api/.data/`，上传目录由 `task init` 写入本检出的绝对路径；两者都被 Git 忽略。真实配置、密钥、数据库和上传内容不进入仓库。

真实系统默认不启用浏览器 MSW。测试通过 `src/mocks/server.ts`（MSW node）注册 handler。

## 发布

```bash
task deps
task build        # 前端构建 → scripts/prepare-webui.mjs → go build -tags=embedweb
task build:check  # 使用 embedweb 标签运行后端测试与 vet
```

二进制通过 `internal/webui` 提供 SPA 回退：直接访问/刷新页面返回 `index.html`；未知 API、缺失静态资源和保留路径仍返回 JSON 404。

运行配置、数据库、上传目录继续外置，migration 仍显式执行。

## 后端通用改动

本分支未修改 `base-go-api/` 的接口、migration、权限或 module 路径。所有差异集中在前端、根目录 Taskfile/脚本/CI/文档。

如后续需要新增通知/公告菜单、补充 `externalUrl` 到当前用户菜单响应等通用后端改动，应单独组织提交，便于与 `template/sidebar` 比较和同步。

## 验证清单

- 登录成功/失败、刷新恢复、401 失效、退出与缓存清理。
- HTTP 200 业务失败提示与字段错误。
- 顶部导航、二级菜单、移动 Drawer、命令搜索键盘操作。
- 菜单权限、直接访问 403、未知 404。
- 用户/角色/菜单/部门/字典/配置/文件/日志/通知/公告/监控的列表、分页与关键写操作。
- 文件上传、下载/预览、状态与删除。
- SQLite migration、`/health`、`/ready`、embedweb 单二进制与 SPA 刷新。
- 前端 `lint`、`typecheck`、`test`、`build`；后端 `test`、`vet`。
- 通知容量契约：后端集成测试调用 `react-admin/tests/notification-capacity.mjs`（Vite + Chromium + 并发 SSE），确认通知列表在 2 秒内刷新。
