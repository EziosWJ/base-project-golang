package cn.ezios.baseapi.modules.system.menu.dto;

import cn.ezios.baseapi.common.model.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class MenuPageQuery extends PageQuery {

    private String menuName;

    private String menuType;

    private Integer status;

    private Integer visible;
}
