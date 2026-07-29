package cn.ezios.baseapi.modules.system.dept.controller;

import cn.ezios.baseapi.common.model.ApiResponse;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.framework.log.OperLog;
import cn.ezios.baseapi.modules.system.dept.dto.DeptPageQuery;
import cn.ezios.baseapi.modules.system.dept.dto.DeptSaveRequest;
import cn.ezios.baseapi.modules.system.dept.service.DeptService;
import cn.ezios.baseapi.modules.system.dept.vo.DeptVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
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

@Tag(name = "部门管理")
@Validated
@RestController
@RequestMapping("/api/system/dept")
public class DeptController {

    private final DeptService deptService;

    public DeptController(DeptService deptService) {
        this.deptService = deptService;
    }

    @Operation(summary = "部门树")
    @GetMapping("/tree")
    public ApiResponse<List<DeptVO>> tree() {
        return ApiResponse.success(deptService.tree());
    }

    @Operation(summary = "部门分页")
    @GetMapping("/page")
    public ApiResponse<PageResult<DeptVO>> page(@Valid DeptPageQuery query) {
        return ApiResponse.success(deptService.page(query));
    }

    @Operation(summary = "部门选择树")
    @GetMapping("/options")
    public ApiResponse<List<DeptVO>> options() {
        return ApiResponse.success(deptService.options());
    }

    @Operation(summary = "部门详情")
    @GetMapping("/{id}")
    public ApiResponse<DeptVO> detail(@PathVariable Long id) {
        return ApiResponse.success(deptService.getDetail(id));
    }

    @OperLog(title = "部门管理", type = "CREATE")
    @Operation(summary = "新增部门")
    @PostMapping
    public ApiResponse<Void> create(@Valid @RequestBody DeptSaveRequest request) {
        deptService.create(request);
        return ApiResponse.success();
    }

    @OperLog(title = "部门管理", type = "UPDATE")
    @Operation(summary = "修改部门")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @Valid @RequestBody DeptSaveRequest request) {
        deptService.update(id, request);
        return ApiResponse.success();
    }

    @OperLog(title = "部门管理", type = "DELETE")
    @Operation(summary = "删除部门")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        deptService.delete(id);
        return ApiResponse.success();
    }

    @OperLog(title = "部门管理", type = "DELETE")
    @Operation(summary = "批量删除部门")
    @PostMapping("/batch-delete")
    public ApiResponse<Void> deleteBatch(@Valid @RequestBody BatchIdsRequest request) {
        deptService.deleteBatch(request);
        return ApiResponse.success();
    }

    @OperLog(title = "部门管理", type = "UPDATE")
    @Operation(summary = "修改部门状态")
    @PatchMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        deptService.updateStatus(id, request);
        return ApiResponse.success();
    }
}
