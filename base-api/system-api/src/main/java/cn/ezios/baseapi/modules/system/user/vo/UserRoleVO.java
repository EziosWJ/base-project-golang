package cn.ezios.baseapi.modules.system.user.vo;

import lombok.Data;

@Data
public class UserRoleVO {

    private Long id;

    private String roleName;

    private String roleCode;

    private Integer status;
}
