# ADR-0005: YAML 优先的运行配置与数据库连接拆分

## Status

Accepted

## Context

Go API 原先要求数据库 DSN 和 JWT 密钥只能通过环境变量提供。该要求使本地 IDE 调试和服务器文件化部署需要额外维护环境变量，且数据库连接信息集中为一个包含凭据的 DSN，不便于查看和修改。

项目使用 Koanf 读取配置，已有基础 YAML、环境 YAML 和 `APP_` 环境变量的覆盖能力。需要保留环境变量覆盖，以兼容 Docker Compose、CI 和容器编排；同时允许开发与部署使用 YAML 作为主要配置载体。

## Decision

### 配置文件与环境选择

配置固定按以下顺序加载：默认值、`configs/config.yaml`、`configs/config.{APP_ENV}.yaml`、`APP_` 环境变量。后加载的值覆盖先加载的值。

`APP_ENV` 是运行环境选择器，只能由进程环境变量提供；它必须在读取环境 YAML 前确定。允许值为 `dev`、`test`、`prod`，未设置时默认 `dev`。`config.yaml` 是必需文件，环境 YAML 是可选文件。

数据库和 JWT 配置允许写入 YAML，不再限定只能通过环境变量提供。生产环境的实际 `config.prod.yaml` 由部署系统以只读文件或挂载方式提供，不提交到 Git；本机 `config.dev.yaml` 可以使用仅限本机的开发凭据。

`.env` 仅是 Docker Compose 的变量文件，不由 Go 程序自动读取。直接运行二进制或通过 IDE 调试时，使用 YAML 或由 IDE 注入环境变量。

### 数据库连接

PostgreSQL 数据库配置拆分为以下字段：

```yaml
database:
  url: postgres://db.example.internal:5432/base_go_api?sslmode=require
  username: base_go_api
  password: change-me
```

`database.url` 必须只描述数据库地址、名称和连接参数，不得包含用户名或密码。应用在创建 GORM dialector 前验证 URL 并将 `username`、`password` 合成为最终 PostgreSQL 连接串；该过程会正确编码凭据中的 URL 特殊字符。

对应的可选环境变量覆盖为 `APP_DATABASE__URL`、`APP_DATABASE__USERNAME`、`APP_DATABASE__PASSWORD` 与 `APP_JWT__SECRET`。

## Consequences

正向影响：

- 本地调试和传统服务器部署可直接维护 YAML，无需依赖 shell 环境变量。
- 数据库地址、账号和密码职责明确，密码中的特殊字符不再要求人工拼接或编码 DSN。
- Docker Compose 和容器编排仍可通过环境变量或 Secret 覆盖同一份配置。

代价与约束：

- YAML 可能含敏感信息；生产配置必须限制文件权限、排除在版本控制和日志收集之外，并纳入备份与轮转策略。
- `APP_` 环境变量优先级最高，部署环境中遗留的变量可能覆盖 YAML，排障时必须同时检查配置文件和进程环境。
- `APP_ENV` 仍需在进程环境中设置，不能通过 YAML 自身选择环境文件。

## Alternatives Considered

### 仅允许环境变量保存敏感配置

未选择。该方案更适合完全由 Secret 管理系统托管的部署，但增加了本地调试和文件化部署的操作成本，不符合当前项目的使用方式。

### 保留单一 `database.dsn`

未选择。DSN 将地址与凭据混在一个字符串中，编辑与排错不直观，也容易在密码含特殊字符时出错。

### 由应用自动读取 `.env`

未选择。`.env` 是 Docker Compose 约定，不应成为 Go 进程的隐式运行时依赖；直接运行时的配置来源应保持明确。
