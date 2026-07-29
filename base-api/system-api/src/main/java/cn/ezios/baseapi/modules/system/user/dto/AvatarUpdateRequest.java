package cn.ezios.baseapi.modules.system.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AvatarUpdateRequest {

    @NotBlank(message = "头像不能为空")
    @Size(max = 255, message = "头像长度不能超过 255")
    private String avatar;
}
