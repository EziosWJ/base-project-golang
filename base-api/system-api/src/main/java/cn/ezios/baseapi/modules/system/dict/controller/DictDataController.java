package cn.ezios.baseapi.modules.system.dict.controller;

import cn.ezios.baseapi.common.model.ApiResponse;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.framework.log.OperLog;
import cn.ezios.baseapi.modules.system.dict.dto.DictDataPageQuery;
import cn.ezios.baseapi.modules.system.dict.dto.DictDataSaveRequest;
import cn.ezios.baseapi.modules.system.dict.service.DictService;
import cn.ezios.baseapi.modules.system.dict.vo.DictDataVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "字典数据")
@Validated
@RestController
@RequestMapping("/api/system/dict-data")
public class DictDataController {

    private final DictService dictService;

    public DictDataController(DictService dictService) {
        this.dictService = dictService;
    }

    @Operation(summary = "字典数据分页")
    @GetMapping("/page")
    public ApiResponse<PageResult<DictDataVO>> page(@Valid DictDataPageQuery query) {
        return ApiResponse.success(dictService.dataPage(query));
    }

    @Operation(summary = "字典数据详情")
    @GetMapping("/{id}")
    public ApiResponse<DictDataVO> detail(@PathVariable Long id) {
        return ApiResponse.success(dictService.dataDetail(id));
    }

    @OperLog(title = "字典数据", type = "CREATE")
    @Operation(summary = "新增字典数据")
    @PostMapping
    public ApiResponse<Void> create(@Valid @RequestBody DictDataSaveRequest request) {
        dictService.createData(request);
        return ApiResponse.success();
    }

    @OperLog(title = "字典数据", type = "UPDATE")
    @Operation(summary = "修改字典数据")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @Valid @RequestBody DictDataSaveRequest request) {
        dictService.updateData(id, request);
        return ApiResponse.success();
    }

    @OperLog(title = "字典数据", type = "DELETE")
    @Operation(summary = "删除字典数据")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        dictService.deleteData(id);
        return ApiResponse.success();
    }

    @OperLog(title = "字典数据", type = "DELETE")
    @Operation(summary = "批量删除字典数据")
    @PostMapping("/batch-delete")
    public ApiResponse<Void> deleteBatch(@Valid @RequestBody BatchIdsRequest request) {
        dictService.deleteDataBatch(request);
        return ApiResponse.success();
    }
}
