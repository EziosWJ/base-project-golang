package cn.ezios.baseapi.modules.system.config.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ConfigVO {

    private Long id;
    private String configName;
    private String configKey;
    private String configValue;
    private String configType;
    private String valueType;
    private Integer status;
    private Integer isBuiltin;
    private String remark;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
