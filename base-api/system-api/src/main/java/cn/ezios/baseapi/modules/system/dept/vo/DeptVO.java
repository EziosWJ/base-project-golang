package cn.ezios.baseapi.modules.system.dept.vo;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class DeptVO {

    private Long id;

    private Long parentId;

    private String deptName;

    private String deptCode;

    private String leader;

    private String phone;

    private String email;

    private Integer sortOrder;

    private Integer status;

    private Integer isBuiltin;

    private String remark;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;

    private List<DeptVO> children = new ArrayList<>();
}
