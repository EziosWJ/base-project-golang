package cn.ezios.baseapi.modules.system.dict.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class DictDataVO {

    private Long id;

    private Long dictTypeId;

    private String dictCode;

    private String dictLabel;

    private String dictValue;

    private Integer sortOrder;

    private String remark;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
