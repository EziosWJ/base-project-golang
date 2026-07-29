package cn.ezios.baseapi.modules.system.log.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class OperLogVO {

    private Long id;

    private String moduleName;

    private String operationType;

    private String requestMethod;

    private String requestUrl;

    private Long operatorId;

    private String operatorName;

    private String operatorIp;

    private String operatorLocation;

    private String requestParams;

    private String responseResult;

    private Long costTime;

    private String operationStatus;

    private String errorMessage;

    private LocalDateTime operationTime;

    private LocalDateTime createTime;
}
