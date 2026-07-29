#!/bin/bash
# base-api 启动脚本
set -e

PROFILE="${PROFILE:-dev}"
DB_URL="${DB_URL:-jdbc:mysql://192.168.1.7:3306/base_project?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true}"
DB_USERNAME="${DB_USERNAME:-root}"

if [ -z "$DB_PASSWORD" ]; then
  echo "错误: 请设置 DB_PASSWORD 环境变量"
  echo "用法: DB_PASSWORD=yourpassword ./start.sh"
  exit 1
fi

export DB_URL DB_USERNAME DB_PASSWORD

echo "启动 system-api (profile: $PROFILE, user: $DB_USERNAME) ..."
exec ./mvnw -pl system-api spring-boot:run -Dspring-boot.run.profiles="$PROFILE"
