package cn.ezios.baseapi.modules.system.log.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@TableName("sys_oper_log")
public class SysOperLog {

    @TableId(type = IdType.AUTO)
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

    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createTime;
}
