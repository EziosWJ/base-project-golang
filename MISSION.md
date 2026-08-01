# Mission: 为 Go 后端管理数据库版本

## Why

在 Java→Go 迁移期间，用户需要能判断数据库结构如何安全创建和演进，避免不同环境的 PostgreSQL 表结构不一致。

## Success looks like

- 能说明 Migration 与 GORM `AutoMigrate()` 的区别。
- 能看懂并运行项目的 Goose migration 命令。
- 能判断一次 Schema 变更是否需要新增 migration 文件。

## Constraints

- 以当前 PostgreSQL 首发、Go 后端迁移项目为实践场景。
- 先掌握版本化 SQL migration，不扩展到高可用或跨数据库运维。

## Out of scope

- 当前不深入迁移回滚策略、零停机大表变更和多数据库 CI。
