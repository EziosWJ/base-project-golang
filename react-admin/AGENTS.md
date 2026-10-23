# react-admin 开发规范

本目录是 `template/sidebar` 脚手架的前端实现：React + Ant Design 侧边栏管理后台，接入同仓库的 Go REST API，不再是纯前端模拟模板。

## 技术基线
- React 19、TypeScript、Vite 7、pnpm 10（以 `pnpm-lock.yaml` 为准）。
- Ant Design 6；样式使用 CSS Modules + Ant Design Design Token，不引入 Tailwind。
- React Router Data Router（`createBrowserRouter` + `RouterProvider`），页面使用 `React.lazy`。
- Axios 负责 HTTP；TanStack Query 管理服务端数据；Zustand 管理登录态、页面标签等客户端状态。
- MSW 仅保留测试能力，真实开发与生产默认不启动浏览器 mock。

## 与 Go 后端的契约
- 统一响应为 `{ code, message, data }`，成功 `code = 200`；HTTP 200 也可能携带业务失败，必须在数据访问层检查 `code`。
- 认证入口：`/api/v1/auth/login`、`/logout`、`/me`、`/menus`；请求头为 `Authorization: Bearer <tokenValue>`。
- 后端分页字段为 `records`，前端统一转换为 `items`，页面只使用 `PaginatedResult`。
- 所有 API 调用集中在 `src/features/<module>/api.ts` 与 `src/lib/api/`；页面不得直接使用 Axios 或拼接响应包。
- 请求失败统一规范化为 `ApiError`；401 清理登录态，页面负责展示错误，公共层不自动弹窗。

## 菜单、路由与权限
- 后端菜单的 `component` 标识与 `src/config/routes.tsx` 的 `menuComponent` 一一映射；未注册的组件不会出现在侧边栏，避免死链接。
- `menuPath` 表示访问该页面所需的后端菜单；直接访问、刷新、标签恢复都会经过同一守卫。缺少菜单时展示 403。
- 通知管理、公告管理仅允许 `ADMIN` 角色；这只是前端入口控制，后端接口仍按既有授权规则校验。
- 面包屑、页面标签、侧边栏选中项都从同一路由/菜单数据派生，不另行硬编码。

## 目录约定
- `src/app/`：Providers、Data Router 装配与错误兜底。
- `src/config/`：环境变量、品牌、路径、路由/菜单映射与静态选项。
- `src/components/`：通用 UI（DataTable、PageHeader、查询状态、状态标签等）。
- `src/features/<module>/api.ts`：模块数据访问层。
- `src/pages/`：登录、工作台、账号与系统管理页面。
- `src/lib/`：Axios 客户端、错误规范化、QueryClient、菜单与导航工具。
- `src/stores/`：Zustand 登录态与页面标签。
- `tests/`：Vitest + React Testing Library，按模块镜像组织。

## 质量要求
- 页面必须覆盖加载、错误、空数据状态；危险操作需要确认；业务失败使用后端 `message`。
- 修改后运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`；也可以在仓库根目录运行 `task frontend:lint`、`task frontend:typecheck`、`task frontend:test`、`task frontend:build`。
- 列表分页、关键词、筛选和排序通过 `useListUrlState` 同步到 URL。
- 新增系统页面时必须同时在后端种子菜单（或管理端菜单）中维护组件标识，并补上本地路由注册。
- 不新增第二套图标库、样式体系或 HTTP 客户端。
