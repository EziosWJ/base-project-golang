package cn.ezios.baseapi.modules.system.dict.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class DictTypeVO {

    private Long id;

    private String dictName;

    private String dictCode;

    private Integer status;

    private Integer sortOrder;

    private Integer isBuiltin;

    private String remark;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
