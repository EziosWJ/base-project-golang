package cn.ezios.baseapi.modules.system.role.dto;

import java.util.List;
import lombok.Data;

@Data
public class RoleMenuRequest {

    private List<Long> menuIds;
}
