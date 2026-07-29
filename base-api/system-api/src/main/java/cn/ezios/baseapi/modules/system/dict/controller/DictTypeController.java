package cn.ezios.baseapi.modules.system.dict.controller;

import cn.ezios.baseapi.common.model.ApiResponse;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.framework.log.OperLog;
import cn.ezios.baseapi.modules.system.dict.dto.DictTypePageQuery;
import cn.ezios.baseapi.modules.system.dict.dto.DictTypeSaveRequest;
import cn.ezios.baseapi.modules.system.dict.service.DictService;
import cn.ezios.baseapi.modules.system.dict.vo.DictTypeVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "字典类型")
@Validated
@RestController
@RequestMapping("/api/system/dict-type")
public class DictTypeController {

    private final DictService dictService;

    public DictTypeController(DictService dictService) {
        this.dictService = dictService;
    }

    @Operation(summary = "字典类型分页")
    @GetMapping("/page")
    public ApiResponse<PageResult<DictTypeVO>> page(@Valid DictTypePageQuery query) {
        return ApiResponse.success(dictService.typePage(query));
    }

    @Operation(summary = "字典类型详情")
    @GetMapping("/{id}")
    public ApiResponse<DictTypeVO> detail(@PathVariable Long id) {
        return ApiResponse.success(dictService.typeDetail(id));
    }

    @OperLog(title = "字典类型", type = "CREATE")
    @Operation(summary = "新增字典类型")
    @PostMapping
    public ApiResponse<Void> create(@Valid @RequestBody DictTypeSaveRequest request) {
        dictService.createType(request);
        return ApiResponse.success();
    }

    @OperLog(title = "字典类型", type = "UPDATE")
    @Operation(summary = "修改字典类型")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @Valid @RequestBody DictTypeSaveRequest request) {
        dictService.updateType(id, request);
        return ApiResponse.success();
    }

    @OperLog(title = "字典类型", type = "DELETE")
    @Operation(summary = "删除字典类型")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        dictService.deleteType(id);
        return ApiResponse.success();
    }

    @OperLog(title = "字典类型", type = "DELETE")
    @Operation(summary = "批量删除字典类型")
    @PostMapping("/batch-delete")
    public ApiResponse<Void> deleteBatch(@Valid @RequestBody BatchIdsRequest request) {
        dictService.deleteTypeBatch(request);
        return ApiResponse.success();
    }

    @OperLog(title = "字典类型", type = "UPDATE")
    @Operation(summary = "修改字典类型状态")
    @PatchMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        dictService.updateTypeStatus(id, request);
        return ApiResponse.success();
    }
}
