package cn.ezios.baseapi.modules.auth.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
@Schema(description = "当前用户可见菜单")
public class AuthMenuVO {

    @Schema(description = "菜单 ID")
    private Long id;

    @Schema(description = "父级菜单 ID")
    private Long parentId;

    @Schema(description = "菜单名称")
    private String menuName;

    @Schema(description = "菜单类型")
    private String menuType;

    @Schema(description = "路由路径")
    private String path;

    @Schema(description = "前端组件标识")
    private String component;

    @Schema(description = "图标")
    private String icon;

    @Schema(description = "权限编码")
    private String permissionCode;

    @Schema(description = "排序值")
    private Integer sortOrder;

    @Schema(description = "是否显示，1=显示，0=隐藏")
    private Integer visible;

    @Schema(description = "子菜单")
    private List<AuthMenuVO> children = new ArrayList<>();
}
