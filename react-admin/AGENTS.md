# AGENTS.md

## 项目定位

本目录是 `template/topnav` 分支的顶部导航管理后台，已从纯前端演示模板接入同仓库的 Go API 与 PostgreSQL/SQLite 后端。

- 真实登录、会话恢复、菜单权限、用户/角色/菜单/部门/字典/配置/文件/日志/通知/公告/监控均通过后端接口工作。
- 客户、项目、订单不属于首版范围，已移除模拟业务页面；如需扩展应另行接入真实接口。
- 来源模板 `html/template/react-topnav-template` 保持纯前端定位，本分支的调整不回写到来源目录。

## 开发前必须阅读

1. `README.md`：安装、命令、环境变量和目录结构。
2. 根目录 `README.md`、`CONTEXT.md` 与 `docs/topnav-template.md`：后端启动、接口约定与菜单映射。
3. 对应 GitHub Issue：需求范围与验收标准。

## 技术基线

- React 19、TypeScript、Vite、pnpm（冻结锁文件安装）。
- Ant Design 6；样式使用 CSS Modules + Ant Design Design Token，不引入 Tailwind 或第二套 UI 体系。
- React Router Data Router（`createBrowserRouter` + `RouterProvider`），页面使用 `React.lazy` + `Suspense`。
- Axios 负责 HTTP 客户端；TanStack Query 管理服务端数据；Zustand 管理会话等跨组件客户端状态。
- Lucide React 图标；Ant Design Charts 用于监控趋势；Day.js 处理日期。
- Vitest + React Testing Library；ESLint 包含 `eslint-plugin-jsx-a11y`。
- MSW 仅用于测试；真实系统在开发和生产的默认数据源都是 Go API。
- 通知/公告通过 SSE（`/system/notification/events`）刷新缓存；事件只是刷新提示，展示内容始终从分页接口读取。登录布局不重复订阅公开流。

## 布局与交互约定

- 顶部导航固定吸顶，桌面端单行三段式布局：品牌、一级导航、全局搜索/主题/通知/账号。
- 一级导航由后端菜单树驱动：目录渲染为下拉菜单，菜单节点渲染为直接入口，外链在新标签打开。
- 窄屏隐藏横向导航，通过汉堡按钮打开侧边 Drawer；Drawer 内保留品牌、搜索和主题入口。
- 全局搜索为命令面板，支持点击入口、Ctrl+K、macOS ⌘K、方向键选择、Enter 跳转和 Esc 关闭。
- 不提供应用内页面标签栏。
- 首次访问主题跟随操作系统，手动切换后保存到 `localStorage`。
- CRUD 采用混合交互：列表独立页面、简单新建/编辑使用 Drawer、危险操作使用确认弹窗。

## 后端接入约定

- API 前缀统一为 `/api/v1`，可通过 `VITE_API_BASE_URL` 覆盖为完整地址。
- 所有响应为 `{ code, message, data }`；HTTP 200 也可能携带业务失败，必须检查 `code === 200`。
- 分页响应为 `{ records, total, page, pageSize }`，在 `src/lib/api/client.ts` 的 `toPageResult` 一次转换为 `items`。
- 认证使用 `Authorization: Bearer <tokenValue>`；401 统一清理会话并跳转登录页，保留 `redirect`。
- 业务代码不直接使用 Axios；统一通过 `src/lib/api/client.ts` 的 `api` 与 `src/features/*/api.ts`。
- 后端部分接口仍只校验登录态或 ADMIN 身份；前端的按钮/菜单显隐不是服务端授权。不要宣称已实现完整服务端 RBAC。
- 页面把服务端校验错误映射到表单字段时使用 `applyServerFieldErrors`。

## 菜单与路由映射

- 本地页面注册在 `src/config/routes.tsx`，每个页面声明 `permissionCode`。
- 后端菜单优先按 `permissionCode`、其次按 `path` 映射到本地页面；未注册的菜单从导航和命令搜索中隐藏。
- 顶部导航、移动端 Drawer、面包屑、命令搜索和直接 URL 访问都使用 `src/config/navigation.ts` 与 `src/lib/access.ts` 的同一套规则。
- 无权限直接访问返回 403；未知路径返回 404。
- 工作台、我的通知、公告和个人中心是本地入口（`authenticatedOnly`）；通知管理、公告管理是 `adminOnly` 入口。
- 尽量保持后端 `permissionCode` 稳定，便于与 `template/sidebar` 分支共享菜单契约。

## 架构规则

- 环境变量集中在 `src/config/env.ts`；业务代码不得直接访问 `import.meta.env`。
- 品牌配置集中在 `src/config/app.config.ts`。
- 请求错误分类并保留原始错误；公共层不自动弹窗。客户端 4xx 不重试；网络/服务端查询错误最多重试一次；写入不自动重试。
- Query 默认 `staleTime=30_000`、`gcTime=300_000`；登录、退出、账号切换时清空查询缓存，避免跨账号数据残留。
- URL 管理列表分页与已提交筛选；列表状态不写入 Zustand。
- `DataTable` 必须显式配置稳定唯一的 `rowKey`。
- 使用 CSS Modules 和 Ant Design Token；不要新增 Tailwind、Storybook 或第二套图标库。

## 目录约定

- `src/app/`：应用 Providers、路由装配和会话启动。
- `src/config/`：环境变量、品牌、路由/导航映射与静态选项。
- `src/layouts/`：顶部导航布局。
- `src/components/`：可复用 UI、鉴权包装与命令面板。
- `src/features/<feature>/`：认证、系统管理、通知、公告、监控的接口封装。
- `src/lib/api/`：Axios 客户端、统一响应解析与错误规范化。
- `src/lib/access.ts`：菜单权限集合与路由访问判断。
- `src/mocks/`：仅测试使用的 MSW server。
- `tests/`：按模块镜像 `src/` 组织。

## 质量要求

- 新增可见交互必须真正可用；不允许死按钮、无说明的空白页或用静态假数据冒充 API 结果。
- 页面必须覆盖加载、错误、空数据状态；危险操作需要确认；网络错误避免重复提示。
- 优先使用语义化 HTML、键盘可操作控件、可见焦点、正确标签和必要的 ARIA 属性。
- 修改后运行相关测试；交付前必须通过 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。
- 数据库结构与接口变化必须同步 migration 和集成测试；不得改写已有 migration 历史。
- 生产错误页不得暴露堆栈或内部实现细节。

## 执行边界

- 严格遵守当前 Issue 的范围和验收条件；不要顺手扩大需求。
- 先检查已有实现再修改，避免重复组件、重复 API 和重复状态。
- 不提前抽公共包，不引入跨模板运行依赖，不为布局差异修改 Go 后端契约。
- 版本更新必须检查 React、Ant Design、React Router、Ant Design Charts、测试工具之间的兼容性，并提交更新后的 `pnpm-lock.yaml`。
