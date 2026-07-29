package cn.ezios.baseapi.modules.system.dict.controller;

import cn.ezios.baseapi.common.model.ApiResponse;
import cn.ezios.baseapi.modules.system.dict.service.DictService;
import cn.ezios.baseapi.modules.system.dict.vo.DictItemVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "字典项")
@RestController
@RequestMapping("/api/system/dict")
public class DictItemController {

    private final DictService dictService;

    public DictItemController(DictService dictService) {
        this.dictService = dictService;
    }

    @Operation(summary = "按编码查询字典项")
    @GetMapping("/{dictCode}/items")
    public ApiResponse<List<DictItemVO>> items(@PathVariable String dictCode) {
        return ApiResponse.success(dictService.items(dictCode));
    }
}
