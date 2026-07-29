package cn.ezios.baseapi.modules.system.file.dto;

import cn.ezios.baseapi.common.model.PageQuery;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class FilePageQuery extends PageQuery {

    private String originalName;

    private String businessModule;

    private String mimeType;

    private Integer status;
}
