# 项目上下文

> 本文件记录本项目的领域语言与术语。它是 `improve-codebase-architecture` / `diagnose` / `tdd` / `grill-with-docs` 等 skills 读取的"词汇表"——当输出里需要命名一个领域概念时，从这里取词，避免各自生造近义词。
>
> **不要在这里编造术语。** 只写已经真实存在于代码或对话里的词。如果项目结构暗示存在某个概念（例如脚手架里预留了 `src/modules/user/`），先不要假设它的业务含义——等业务含义在对话里浮现、并经 `/grill-with-docs` 确认后再补进来。

## 项目概览

- **项目代号**: base-project-java 仓库
- **仓库类型**: monorepo
- **交流 / 输出语言**: 中文
- **项目定位**: 已有 React 管理后台及 Java 参考后端；目标是新增 Go REST API 逐步替代 Java 后端，前端保持独立部署。
- **当前后端事实**: `base-api/` 是 Java 行为参考；`base-go-api/` 已有可运行的 Go 平台（Gin、配置、PostgreSQL 连接池、Goose、统一响应、CORS、可观测性与 Swagger），并已迁移 `/api/auth`、角色、菜单、部门、用户、字典类型、字典数据与系统配置接口。用户的禁用、删除、重置密码和本人改密均与撤销其全部 PostgreSQL JWT 会话处于同一事务；所有已迁移管理模块的成功写操作写入操作审计日志。文件及日志查询接口仍按 Issue 依赖顺序替代 Java 行为。
- **脚手架占位内容**: 脚手架里已出现大量"占位"示例（如 HelloWorld、UserTable、示例组件等），这些**不是真正的业务概念**，只是脚手架产物。真正的业务领域术语应来自后续的业务对话，而不是反向推导脚手架示例。

## 目录结构

```
/
├── react-admin/      # 前端（管理后台 SPA）
├── base-api/         # 现有 Java API（行为与接口参考）
├── base-go-api/      # Go REST API（平台骨架已创建，业务模块逐步迁移）
├── record/           # 项目过程记录
├── docs/
│   ├── adr/          # 架构决策记录（ADR）
│   └── agents/       # Agent skills 的仓库级配置
└── task/             # 任务上下文（读取范围边界时参考）
```

## 技术栈与演进状态

### 前端 react-admin
- 框架: React 19 + TypeScript + Vite 6
- 路由: react-router-dom v7
- 状态管理: Zustand
- 表单: react-hook-form + zod（@hookform/resolvers）
- 样式: Tailwind CSS + class-variance-authority + tailwind-merge
- 图标: lucide-react
- Lint: ESLint + typescript-eslint

### 当前后端 base-api（已确认，来自 Maven manifest 与配置）
- 框架: Spring Boot 3（Java）
- ORM: MyBatis-Plus（含 jsqlparser）
- 认证/鉴权: Sa-Token
- 验证: spring-boot-starter-validation
- 横切关注点: spring-boot-starter-aop
- 运行时数据库配置: MySQL JDBC；`application.yml` 的默认连接仍指向 MySQL。

### 目标 Go 后端（架构已决策，平台骨架已落地）

- 形态: 模块化单体（Modular Monolith），只提供 REST API；不提前拆微服务。
- Web: Gin；数据访问: GORM + Go 标准 `database/sql`；Schema: Goose migration。
- 长期兼容目标: PostgreSQL、MySQL、SQLite；首发运行与集成测试只承诺 PostgreSQL。MySQL、SQLite 必须在真实集成测试通过后才能宣称支持；在此之前仍应避免无必要的 PostgreSQL 特性。
- 配置: 使用 Koanf v2，覆盖顺序为默认值 → `config.yaml` → `config.{APP_ENV}.yaml` → `APP_` 环境变量；嵌套键使用双下划线（如 `APP_DATABASE__DSN`）。数据库 `driver` 预留 `postgres`、`mysql`、`sqlite`；密码、密钥和实际 DSN 只经环境变量或部署密钥注入，不能提交 Git。
- API: 新建接口优先使用 `/api/v1/...`、统一响应/错误码/分页。Gin Handler 与 DTO 注释是文档来源，使用 `swaggo/swag` 生成并提交 Swagger 2.0 文档；Swagger UI 仅在开发环境开放。迁移既有前端接口时，以 ADR-0002 的兼容契约为准，暂保留既有 `/api/**` 路径，直到另有版本化决策。
- CORS: 默认允许跨域 Bearer Token 请求且不启用 Cookie 凭据；可通过精确 `allowed_origins` 配置收紧来源范围，不使用允许凭据的通配来源。
- 认证: 目标为 JWT 加数据库管理的动态角色和菜单关系；`ADMIN` 是内置角色，`admin`、`user` 只是角色示例。JWT 使用 HS256，密钥由环境变量注入，包含 `sub`、`jti`、`iat`、`exp` 并校验 `issuer`、`audience`，不包含角色或菜单。Gin middleware 首版只校验登录态，不按 `permissionCode` 拦截接口；会话持久化在 PostgreSQL `auth_session` 表中，JWT `jti` 用于校验和登出即时撤销；不引入 Redis、Casbin、ABAC、多租户权限或组织树数据权限。
- 可观测性: 使用 `log/slog` 记录 request_id、请求方法与路径、状态、耗时、user_id 和错误；`/health` 只检查进程存活，`/ready` 检查 PostgreSQL 并在不可用时返回 503，`/metrics` 不要求 JWT、仅通过内部网络或反向代理白名单供 Prometheus 抓取且不应用默认 CORS。业务审计日志须落库，不能由应用日志替代：middleware 将 request_id、IP、User-Agent 写入标准 `context.Context`，Service 显式记录审计，Repository 持久化；认证记录成功与失败登录，其他操作仅在业务成功后记录。
- 其他目标组件: 本地文件系统加 Docker Volume（文件服务与存储实现解耦）、Excelize、Docker 与 Docker Compose；不提前引入 Kubernetes、OpenTelemetry tracing、Redis 分布式锁或微服务治理基础设施。

详细的取舍、替代方案与重新评估条件见 [ADR-0004](docs/adr/0004-backend-architecture-and-database-strategy.md)。

## Go 后端架构约定（目标实现必须遵守）

### 初始目录布局

```text
base-go-api/
├── cmd/api/                 # HTTP 服务入口
├── cmd/migrate/             # 显式 Goose migrate 命令
├── configs/                 # 不含秘密的 YAML 配置
├── migrations/              # Schema 与 seed migration
├── docs/                    # 提交的 Swagger 生成文件
├── internal/app/            # 依赖组装与路由注册
├── internal/config/         # Koanf 配置加载
├── internal/platform/
│   ├── database/            # GORM、连接池、方言隔离
│   └── http/                # 统一响应、错误和通用 middleware
└── internal/auth/           # 首个业务模块
```

测试与被测模块同目录放置为 `*_test.go`；不创建全局 controller/service/repository 目录。

### 模块与依赖

- 代码优先按业务模块组织，而不是把 controller/service/repository/entity/dto 分散为全局技术目录。模块按需包含 `handler.go`、`service.go`、`repository.go`、`dto.go`、`model.go`；不为形式补齐空文件。
- 推荐边界为 `Handler → Service → Repository → GORM → database/sql → 数据库`。依赖在 `internal/app` 或实际 composition root 手工组装：Config → Database → Repository → Service → Handler → Router。
- Handler 只处理 HTTP 参数、DTO、参数校验、状态码和 API response；不写业务逻辑、不直接访问数据库。
- Service 使用 `context.Context`，负责规则、校验、状态流转和编排；不依赖 Gin Context、GORM 或具体数据库。简单审批以 `Approve()`、`Reject()` 等明确方法表达，不使用万能 `UpdateStatus()`。
- Repository 负责查询、持久化和事务中的数据库操作。普通模块可直接使用含 `db *gorm.DB` 的具体 Repository；仅在确有多实现或跨模块能力边界时定义 interface。禁止 Java 式空壳 `RepositoryImpl`、Factory。
- 不使用 Fx、Dig、Wire、Service Locator、业务 Singleton 或全局 Service。基础设施在启动时创建一次并通过依赖传递共享。

### 数据库与 Migration

- 业务查询优先采用 PostgreSQL、MySQL、SQLite 均稳定支持的 CRUD、普通事务、WHERE/JOIN/GROUP BY/ORDER BY、LIMIT/OFFSET、普通索引/唯一约束/外键、聚合、LIKE/IN/NULL 及基础标量类型。
- 不要让 JSONB、ARRAY、ILIKE、RETURNING、DISTINCT ON、扩展、专属 UUID、MySQL ENUM/函数/UPSERT、专属全文搜索或存储过程扩散到业务层。确有需要时，隔离在 infrastructure/database 或 Repository 层，并记录原因、提供针对性测试；驱动判断不得进入 Handler 或 Service。
- 启动时只创建一个 GORM DB；通过 `gormDB.DB()` 获取并配置同一个 `*sql.DB` 的连接池（MaxOpenConns、MaxIdleConns、ConnMaxLifetime、ConnMaxIdleTime）。Repository/Service 持有的是池化 DB 句柄，不是固定 TCP 连接；不另引入连接池框架。
- Schema 变更必须随代码提交版本化 Goose migration。生产环境和 API 进程均不自动执行 migration 或 `AutoMigrate()`；部署前由独立的 `migrate up` 步骤执行，Docker Compose 使用一次性 migrate 服务并在成功后启动 API。本地开发也执行相同的显式命令。表、索引和约束与管理员、根部门、`ADMIN`、菜单、字典、系统配置等内置数据分属独立 migration；种子数据只执行一次，不由 API 自动补种。优先公共 DDL，仅在语法确有差异时增加方言 migration，避免复制三套相同文件。
- 实体主键延续现有接口的数据形态，使用数据库生成的 `int64` 数值 ID；PostgreSQL 通过 identity/sequence 生成，业务层不得依赖具体方言语法，也不在迁移中切换为 UUID。
- 数据库兼容意味着真实集成测试通过，不只是能建立连接。首发只验证 PostgreSQL；后续 MySQL、SQLite 验收范围为 CRUD、事务、分页、排序、普通 JOIN/聚合、权限、审批与审计日志。
- 单元测试不连接数据库；PostgreSQL 集成测试使用 Docker 提供的临时隔离实例，并验证 migration、Repository 与认证会话。自动化测试不得连接实际部署 DSN 或其数据。

### 部署数据库拓扑

- 开发 Docker Compose 启动独立的 PostgreSQL 命名 volume，再依次运行 migrate 与 API；该数据库只绑定本机端口。
- 实际部署通过环境变量的外部 PostgreSQL DSN 运行 migrate 与 API，不依赖 Compose 数据库容器。

### 运行时约定

- 少量定时任务优先 `time.Timer`/`time.Ticker`，只有需要 cron 表达式才引入轻量库。多实例互斥不能把 PostgreSQL advisory lock 当通用方案；需要时另行设计 lock table、lease 或唯一任务键加事务/超时。
- 新依赖必须说明解决的真实问题；不得为“以后可能需要”预先引入服务注册、RPC、配置中心、分布式事务、MQ、Redis、Gateway 或 Kubernetes。未来拆分时，由业务模块自然演变为 REST 服务，Gateway 再保持外部 URL 兼容。

## Agent 开发规则

1. 先理解现有模块边界，优先在既有模块内完成改动；不要随意新增抽象层或修改 generated code。
2. Handler 不直接操作数据库，Service 不依赖 Gin Context、GORM 或具体数据库，Repository 负责数据访问。
3. 数据库专属能力必须局部化；修改 Schema 必须增加 migration；修改 REST API 必须同步 Swagger/OpenAPI 或契约文档。
4. 不创建业务 Singleton、全局 Service，或未被需求证明的复杂架构。
5. Go 服务落地后，完成改动至少依次执行 `go fmt ./...`、`go test ./...`、`go vet ./...`、`golangci-lint run`；若环境或项目尚不具备某命令，必须说明原因和未执行项。

## 现状与目标差异

- Go 服务已具备 Gin、GORM、Goose、Prometheus、`log/slog`、Koanf、Docker Compose、Swagger 与 JWT 会话认证能力，并可执行格式化、测试与静态检查；Excelize 及其余业务模块仍按 Issue 顺序实施。
- Java 服务仍使用 Spring Boot、MyBatis-Plus、Sa-Token 和 MySQL JDBC，且其默认配置仍为 MySQL；这与 Go 目标架构不同，迁移前不得擅自把 Java 行为改写为目标实现。
- ADR-0002 规定迁移期间保持既有 `/api/**`、响应结构和 Bearer Token 外部契约；与新接口 `/api/v1` 规范并存时，迁移兼容优先。

## 已知领域术语（初始为空占位——等业务浮现后填充）

<!-- 示例格式（仅在业务概念真实出现并确认后补入）：
| 术语 | 同义词 / 禁用词 | 定义 |
| --- | --- | --- |
| 训问 | 提问、询问 | 士兵用户发起的一次求助行为，由后端生成任务分发给 ...
-->

## 边界与职责约定（已确认）

- **前端改动范围**: `react-admin/src/**`，不要新建顶层 `src/`。
- **现有后端改动范围**: `base-api/**`；规划 Go 后端创建后在 `base-go-api/**` 内开发，不能在仓库根目录新建散落的 Go `src/`。
- **脚手架结构参考**: 只看单个子模块，不要批量扫目录。
- **架构参考**: 只在 `docs/` 或 `experience/` 下找摘要。

## 何时本文件需要更新

以下信号之一出现时，应触发本文件（和/或 `docs/adr/`）的更新，通常由 `/grill-with-docs` 完成：

- 业务对话里**首次出现**一个项目通用名词（例如"训问""任务单"）。
- 两个模块对同一个概念使用不同名字——应在这里趋向统一。
- 某次架构决策被沉淀下来（例如"为什么选 Zustand 而非 Redux"）——应写进 `docs/adr/`。

---

_本文件最初由 `/setup-matt-pocock-skills` 与 `/grill-with-docs` 协作初始化。后续每一条术语都应该有可追溯的业务来源。_
