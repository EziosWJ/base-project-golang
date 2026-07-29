package cn.ezios.baseapi.modules.system.log.dto;

import cn.ezios.baseapi.common.model.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class OperLogPageQuery extends PageQuery {

    private String moduleName;

    private String operationType;

    private String operatorName;

    private String operationStatus;
}
