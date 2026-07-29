package cn.ezios.baseapi.modules.system.config.dto;

import cn.ezios.baseapi.common.model.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ConfigPageQuery extends PageQuery {

    private String configName;
    private String configKey;
    private String configType;
    private Integer status;
}
