# base-api 启动说明

## 快速启动

```bash
# 进入项目目录
cd base-api

# 启动（默认 dev profile，数据库 192.168.1.7:3306/base_project）
DB_PASSWORD=yourpassword ./start.sh
```

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DB_PASSWORD` | **是** | 无 | 数据库密码 |
| `DB_USERNAME` | 否 | `root` | 数据库用户名 |
| `DB_URL` | 否 | `jdbc:mysql://192.168.1.7:3306/base_project?...` | 数据库连接地址 |
| `PROFILE` | 否 | `dev` | Spring profile（`dev` / `prod`） |

## 示例

```bash
# 最简启动
DB_PASSWORD=yourpassword ./start.sh

# 指定生产环境
PROFILE=prod DB_PASSWORD=yourpassword ./start.sh

# 远程数据库（覆盖默认地址）
DB_URL="jdbc:mysql://其他地址:3306/base_project?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true" \
DB_PASSWORD=yourpassword ./start.sh
```

## 启动后

- API 服务: http://localhost:8080
- Swagger 文档（dev）: http://localhost:8080/swagger-ui.html

## 默认管理员账号

- 用户名: `admin`
- 密码: `admin123`
