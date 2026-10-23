# CLAUDE.md

请使用中文交流和思考！

## 项目结构

```
project/
├── react-admin/   # 前端项目（React + Ant Design），直接在此开发
├── base-go-api/   # 后端项目（Go），直接在此开发
```

当前分支为 `template/topnav`：前端采用顶部导航布局并已接入真实 Go 后端。纯前端来源模板
`html/template/react-topnav-template` 保持原定位，修改只发生在目标分支内。

## 上下文管理规则

**避免全量读取脚手架项目，按需读取：**

1. **不要递归列出** `react-admin/` 或 `base-go-api/` 全部文件
2. **先读 task 文件**（`task/`）了解当前任务范围，再针对性读源码
3. **用 Explore agent 搜索**，而不是直接 Read 整个目录
4. **一次只读一个子模块**（如 `src/components/UserTable.tsx`），不要批量读整个目录
5. **需要架构参考时**，只读 `docs/` 或 `experience/` 下的摘要文件

## 工作模式

- **直接在脚手架项目内开发**，不新建 `src/` 目录
- push 已禁用，可以放心在 `react-admin/` 和 `base-go-api/` 中改动代码
- 参考脚手架结构时，按需读取具体文件，不要批量扫描

## Taskfile 开发与启动入口

根目录 `Taskfile.yml` 是项目日常开发、启动和验证的统一入口。Agent 优先使用这些任务，不要在已有等价任务时自行拼接目录切换、环境变量或启动命令。

- 后端本地配置使用 `base-go-api/configs/config.dev.yaml`；数据库和 JWT 配置放在该文件中，不另建根目录 `.env.local` 作为后端运行配置。
- `task db:migrate`：执行全部 Goose schema 和 seed migration；首次启动、数据库重建或修改 migration 后执行。
- `task api`：启动 Go API，默认监听 `:8150`。
- `task deps`：使用 `pnpm-lock.yaml` 冻结安装前端依赖。
- `task web`：启动 React 开发服务器，默认监听 `:5173`；额外参数通过 `task web -- --port 5174` 传入。
- `task dev`：先执行数据库 migration，再并行启动 API 和前端；适合全新环境或需要确保数据库已更新时使用。
- `task backend:test`：执行后端单元测试。
- `task backend:check`：执行后端测试和 `go vet`。
- `task backend:integration`：执行 PostgreSQL 集成测试，需要 Docker。
- `task frontend:lint`：执行前端 ESLint。
- `task frontend:typecheck`：执行前端 TypeScript 检查。
- `task frontend:test`：执行前端 Vitest 测试。
- `task frontend:build`：执行前端 TypeScript/Vite 构建。
- `task check`：执行后端检查、前端 lint、typecheck、test 和构建。
- `task test`：执行默认后端测试集。

推荐的 Agent 验证顺序：后端改动执行 `task backend:check`，前端改动执行 `task frontend:lint`、`task frontend:typecheck`、`task frontend:test` 和 `task frontend:build`，涉及数据库结构时先执行 `task db:migrate`，需要联调时再启动 `task api` 或 `task dev`。长时间运行的任务必须配合健康检查或明确的超时与清理；API 使用 `/health` 检查存活、`/ready` 检查数据库就绪。

### 并行模板开发

- `template/topnav` 与 `template/sidebar` 可能并行开发，使用独立 worktree，不互相合并或依赖未完成的工作。
- 联调建议使用前端 `5174`、后端 `8100`：`APP_HTTP__ADDRESS=:8100 task api:sqlite` 与 `VITE_API_PROXY_TARGET=http://127.0.0.1:8100 pnpm --dir react-admin dev --port 5174`。
- 使用 SQLite 时保留本 worktree 自己的数据库、配置和上传目录；Taskfile 默认值不为并行联调而修改。
- 两个模板分支保持相同 Go module 路径和后端契约；不得为布局差异修改后端接口。
- 前端真实系统默认不启用浏览器 MSW；MSW 只用于测试。
- 前端菜单按后端 `permissionCode`（其次 `path`）映射到 `src/config/routes.tsx`；未注册页面必须从导航隐藏。

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Agent skills

### Issue tracker

工作项存放在本仓库的 GitHub Issues，skills 通过 `gh` CLI 读写。详见 `docs/agents/issue-tracker.md`。

### Triage labels

triage 流转使用 5 个默认标签（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。详见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文：根目录 `CONTEXT.md` + `docs/adr/`。详见 `docs/agents/domain.md`。
