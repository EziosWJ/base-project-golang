package cn.ezios.baseapi.modules.system.dict.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DictDataSaveRequest {

    @NotNull(message = "字典类型不能为空")
    private Long dictTypeId;

    @NotBlank(message = "字典标签不能为空")
    @Size(max = 100, message = "字典标签长度不能超过 100")
    private String dictLabel;

    @NotBlank(message = "字典值不能为空")
    @Size(max = 100, message = "字典值长度不能超过 100")
    private String dictValue;

    private Integer sortOrder;

    private String remark;
}
