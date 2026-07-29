package cn.ezios.baseapi.common.exception;

import cn.ezios.baseapi.common.enums.ResponseCode;
import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final int code;

    public BusinessException(String message) {
        this(ResponseCode.BAD_REQUEST.getCode(), message);
    }

    public BusinessException(ResponseCode responseCode) {
        this(responseCode.getCode(), responseCode.getMessage());
    }

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }
}
