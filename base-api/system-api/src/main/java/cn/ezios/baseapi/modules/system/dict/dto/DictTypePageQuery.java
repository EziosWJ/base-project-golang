package cn.ezios.baseapi.modules.system.dict.dto;

import cn.ezios.baseapi.common.model.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class DictTypePageQuery extends PageQuery {

    private String dictName;

    private String dictCode;

    private Integer status;
}
