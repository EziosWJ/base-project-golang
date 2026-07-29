package cn.ezios.baseapi.modules.system.user.vo;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class UserVO {

    private Long id;

    private String username;

    private String nickname;

    private String phone;

    private String email;

    private String avatar;

    private String gender;

    private Long deptId;

    private Integer status;

    private Integer isBuiltin;

    private LocalDateTime lastLoginTime;

    private String lastLoginIp;

    private String remark;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    private UserDeptVO dept;

    private List<UserRoleVO> roles = new ArrayList<>();
}
