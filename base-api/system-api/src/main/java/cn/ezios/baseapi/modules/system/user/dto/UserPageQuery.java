package cn.ezios.baseapi.modules.system.user.dto;

import cn.ezios.baseapi.common.model.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class UserPageQuery extends PageQuery {

    private String username;

    private String nickname;

    private String phone;

    private String email;

    private Integer status;

    private Long deptId;
}
