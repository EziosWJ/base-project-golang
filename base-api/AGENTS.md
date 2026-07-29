# base-api 开发规范

请使用中文交流和思考！

## 技术栈
- Java 21 + Spring Boot 3.x + MySQL 8 + MyBatis-Plus + Sa-Token
- Maven 多模块，`system-api` 为当前可启动服务

## 核心原则
- 先读 `doc/development-constraints.md` 了解开发约束
- 修改前理解现有结构，不破坏已有规范
- 修改后优先执行 `./mvnw -pl system-api -am -DskipTests compile` 验证

## 关键约束
- REST 单数资源名，批量删除用 `POST /batch-delete`
- 密码必须 BCrypt，内置数据用 `is_builtin` 保护
- 表前缀 `sys_`，字段 `snake_case`，不使用外键，默认逻辑删除

## 经验与注意事项
详见 `experience/LESSONS.md`
