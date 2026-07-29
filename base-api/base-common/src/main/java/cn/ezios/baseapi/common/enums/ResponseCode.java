package cn.ezios.baseapi.common.enums;

import lombok.Getter;

@Getter
public enum ResponseCode {

    SUCCESS(200, "success"),
    BAD_REQUEST(400, "参数错误"),
    UNAUTHORIZED(401, "未登录或 token 已失效"),
    FORBIDDEN(403, "无权限"),
    NOT_FOUND(404, "数据不存在"),
    INTERNAL_ERROR(500, "系统错误");

    private final int code;
    private final String message;

    ResponseCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
