package cn.ezios.baseapi.modules.system.config.vo;

import lombok.Data;

@Data
public class ConfigByKeyVO {

    private String configKey;
    private String configValue;
    private String valueType;
    private String configName;
}
