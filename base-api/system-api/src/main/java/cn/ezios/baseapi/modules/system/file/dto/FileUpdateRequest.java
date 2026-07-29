package cn.ezios.baseapi.modules.system.file.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FileUpdateRequest {

    @Size(max = 50, message = "业务模块长度不能超过 50")
    private String businessModule;

    @Size(max = 500, message = "备注长度不能超过 500")
    private String remark;
}
