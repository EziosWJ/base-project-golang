# CONTEXT.md

> 本文件记录本项目的领域语言与术语。它是 `improve-codebase-architecture` / `diagnose` / `tdd` / `grill-with-docs` 等 skills 读取的"词汇表"——当输出里需要命名一个领域概念时，从这里取词，避免各自生造近义词。
>
> **不要在这里编造术语。** 只写已经真实存在于代码或对话里的词。如果项目结构暗示存在某个概念（例如脚手架里预留了 `src/modules/user/`），先不要假设它的业务含义——等业务含义在对话里浮现、并经 `/grill-with-docs` 确认后再补进来。

## 项目概览

- **项目代号**: base-project-java 仓库
- **仓库类型**: monorepo
- **交流 / 输出语言**: 中文
- **脚手架占位内容**: 脚手架里已出现大量"占位"示例（如 HelloWorld、UserTable、示例组件等），这些**不是真正的业务概念**，只是脚手架产物。真正的业务领域术语应来自后续的业务对话，而不是反向推导脚手架示例。

## 目录结构

```
/
├── react-admin/      # 前端（管理后台 SPA）
├── base-api/         # 后端（Java API）
├── record/           # 项目过程记录
├── docs/
│   ├── adr/          # 架构决策记录（ADR）
│   └── agents/       # Agent skills 的仓库级配置
└── task/             # 任务上下文（读取范围边界时参考）
```

## 技术栈（已确认，来自 manifest）

### 前端 react-admin
- 框架: React 19 + TypeScript + Vite 6
- 路由: react-router-dom v7
- 状态管理: Zustand
- 表单: react-hook-form + zod（@hookform/resolvers）
- 样式: Tailwind CSS + class-variance-authority + tailwind-merge
- 图标: lucide-react
- Lint: ESLint + typescript-eslint

### 后端 base-api
- 框架: Spring Boot 3（Java）
- ORM: MyBatis-Plus（含 jsqlparser）
- 认证/鉴权: Sa-Token
- 验证: spring-boot-starter-validation
- 横切关注点: spring-boot-starter-aop
- 运行时依赖（来自 pom）: MySQL、Redis（sa-token-redis 集成）

## 已知领域术语（初始为空占位——等业务浮现后填充）

<!-- 示例格式（仅在业务概念真实出现并确认后补入）：
| 术语 | 同义词 / 禁用词 | 定义 |
| --- | --- | --- |
| 训问 | 提问、询问 | 士兵用户发起的一次求助行为，由后端生成任务分发给 ...
-->

## 边界与职责约定（已确认）

- **前端改动范围**: `react-admin/src/**`，不要新建顶层 `src/`。
- **后端改动范围**: `base-api/src/**`。
- **脚手架结构参考**: 只看单个子模块，不要批量扫目录。
- **架构参考**: 只在 `docs/` 或 `experience/` 下找摘要。

## 何时本文件需要更新

以下信号之一出现时，应触发本文件（和/或 `docs/adr/`）的更新，通常由 `/grill-with-docs` 完成：

- 业务对话里**首次出现**一个项目通用名词（例如"训问""任务单"）。
- 两个模块对同一个概念使用不同名字——应在这里趋向统一。
- 某次架构决策被沉淀下来（例如"为什么选 Zustand 而非 Redux"）——应写进 `docs/adr/`。

---

_本文件最初由 `/setup-matt-pocock-skills` 与 `/grill-with-docs` 协作初始化。后续每一条术语都应该有可追溯的业务来源。_
