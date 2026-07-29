# base-api 脚手架开发经验与注意事项

## 项目架构

- 单 Spring Boot 模块化单体（非微服务）
- 技术栈：Java 21 + Spring Boot 3.x + MySQL 8 + MyBatis-Plus + Sa-Token
- 每个业务模块分层：controller / service / mapper / entity / dto / vo
- 第一版不用 Redis / Flyway / 对象存储

## 开发约束

- REST 资源名单数，路径如 `/api/system/user`
- 批量删除统一 `POST /batch-delete`（不用 DELETE + body，代理会丢弃 body）
- 树结构统一 `parent_id` / `sort_order` / `children` 字段
- 内置数据用 `is_builtin=1` 保护，禁止删除和修改关键字段
- 密码必须 BCrypt 加密
- 文件通过后端接口转发，不暴露磁盘路径
- 日志清空需配置开关控制，非始终可用
- 表前缀 `sys_`，字段 `snake_case`，不使用数据库外键，默认逻辑删除

## 数据库设计注意

- 逻辑删除 + 唯一索引的隐蔽冲突：已删除记录的 key 仍占唯一索引，重新插入会触发 500
  - 解决：唯一索引字段在删除时也做唯一性检查，或使用复合唯一索引包含删除标记
- 顶级部门 `parentId` 固定传 `0`，不要省略

## 测试经验

- 测试数据必须使用时间戳前缀避免跨次运行冲突
- 清理代码必须放在 `@AfterAll` 中，不要依赖测试末尾清理
- 写断言前必须先读 Controller → Service → GlobalExceptionHandler → VO 四层源码确认行为
- 集成测试需启动完整 Spring 上下文，注意测试环境配置隔离

## 认证与鉴权

- Sa-Token Bearer 认证，滑动续期 2 小时
- 前端登录后依次调用 `/auth/me` 和 `/auth/menus` 初始化
- Token 格式：`Bearer <tokenValue>`

## 统一响应格式

- 响应：`{code, message, data}`
- 分页：`{records, total, page, pageSize}`
- 状态字段 `1/0` 表示启停用

## 系统配置模块

- `configKey` 唯一索引含已逻辑删除的记录
- `valueType`（TEXT/NUMBER/BOOLEAN）后端不校验值类型，前端自行校验
- `BOOLEAN` 类型存储为字符串 `"true"/"false"`
- 内置配置批量删除时静默跳过不报错
