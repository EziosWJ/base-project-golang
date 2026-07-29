package cn.ezios.baseapi.common.model;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import lombok.Data;

@Data
public class BatchIdsRequest {

    @NotEmpty(message = "ID 列表不能为空")
    private List<Long> ids;
}
