package cn.ezios.baseapi.modules.system.dept.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DeptSaveRequest {

    @NotNull(message = "父级部门不能为空")
    private Long parentId;

    @NotBlank(message = "部门名称不能为空")
    @Size(max = 100, message = "部门名称长度不能超过 100")
    private String deptName;

    @NotBlank(message = "部门编码不能为空")
    @Size(max = 50, message = "部门编码长度不能超过 50")
    private String deptCode;

    private String leader;

    private String phone;

    @Email(message = "邮箱格式不正确")
    private String email;

    private Integer sortOrder;

    private Integer status;

    private String remark;
}
