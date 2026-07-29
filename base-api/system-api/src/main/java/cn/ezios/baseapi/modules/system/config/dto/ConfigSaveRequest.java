package cn.ezios.baseapi.modules.system.config.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ConfigSaveRequest {

    @NotBlank(message = "配置名称不能为空")
    @Size(max = 100, message = "配置名称长度不能超过 100")
    private String configName;

    @NotBlank(message = "配置键不能为空")
    @Size(max = 100, message = "配置键长度不能超过 100")
    private String configKey;

    @Size(max = 500, message = "配置值长度不能超过 500")
    private String configValue;

    private String configType;

    private String valueType;

    private Integer status;

    private String remark;
}
