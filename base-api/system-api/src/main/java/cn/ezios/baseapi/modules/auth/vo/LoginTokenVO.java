package cn.ezios.baseapi.modules.auth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "登录令牌信息")
public class LoginTokenVO {

    @Schema(description = "Token 请求头名称")
    private String tokenName;

    @Schema(description = "Token 请求头值")
    private String tokenValue;

    @Schema(description = "Token 剩余有效期，单位秒")
    private long expiresIn;
}
