package cn.ezios.baseapi.modules.system.dict.dto;

import cn.ezios.baseapi.common.model.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class DictDataPageQuery extends PageQuery {

    private Long dictTypeId;

    private String dictCode;

    private String dictLabel;

    private String dictValue;
}
