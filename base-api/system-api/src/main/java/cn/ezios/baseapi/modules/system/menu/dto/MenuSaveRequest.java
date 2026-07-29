package cn.ezios.baseapi.modules.system.menu.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MenuSaveRequest {

    @NotNull(message = "父级菜单不能为空")
    private Long parentId;

    @NotBlank(message = "菜单名称不能为空")
    @Size(max = 50, message = "菜单名称长度不能超过 50")
    private String menuName;

    @NotBlank(message = "菜单类型不能为空")
    private String menuType;

    private String path;

    private String component;

    private String externalUrl;

    private String icon;

    private String permissionCode;

    private Integer sortOrder;

    private Integer visible;

    private Integer status;

    private String remark;
}
