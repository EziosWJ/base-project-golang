package cn.ezios.baseapi.modules.system.role.dto;

import cn.ezios.baseapi.common.model.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class RolePageQuery extends PageQuery {

    private String roleName;

    private String roleCode;

    private Integer status;
}
