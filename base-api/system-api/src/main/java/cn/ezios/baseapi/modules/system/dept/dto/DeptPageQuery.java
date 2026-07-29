package cn.ezios.baseapi.modules.system.dept.dto;

import cn.ezios.baseapi.common.model.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class DeptPageQuery extends PageQuery {

    private String deptName;

    private String deptCode;

    private Integer status;
}
