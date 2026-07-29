package cn.ezios.baseapi.modules.system.menu.vo;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class MenuVO {

    private Long id;

    private Long parentId;

    private String menuName;

    private String menuType;

    private String path;

    private String component;

    private String externalUrl;

    private String icon;

    private String permissionCode;

    private Integer sortOrder;

    private Integer visible;

    private Integer status;

    private Integer isBuiltin;

    private String remark;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    private List<MenuVO> children = new ArrayList<>();
}
