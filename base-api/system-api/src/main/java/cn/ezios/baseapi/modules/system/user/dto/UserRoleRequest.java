package cn.ezios.baseapi.modules.system.user.dto;

import java.util.List;
import lombok.Data;

@Data
public class UserRoleRequest {

    private List<Long> roleIds;
}
