package cn.ezios.baseapi.modules.system.role.vo;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class RoleVO {

    private Long id;

    private String roleName;

    private String roleCode;

    private Integer status;

    private Integer sortOrder;

    private Integer isBuiltin;

    private String remark;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    private List<Long> menuIds = new ArrayList<>();
}
