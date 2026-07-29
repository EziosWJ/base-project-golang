package cn.ezios.baseapi.modules.system.role.controller;

import cn.ezios.baseapi.common.model.ApiResponse;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.framework.log.OperLog;
import cn.ezios.baseapi.modules.system.role.dto.RoleMenuRequest;
import cn.ezios.baseapi.modules.system.role.dto.RolePageQuery;
import cn.ezios.baseapi.modules.system.role.dto.RoleSaveRequest;
import cn.ezios.baseapi.modules.system.role.service.RoleService;
import cn.ezios.baseapi.modules.system.role.vo.RoleVO;
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

@Tag(name = "角色管理")
@Validated
@RestController
@RequestMapping("/api/system/role")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @Operation(summary = "角色分页")
    @GetMapping("/page")
    public ApiResponse<PageResult<RoleVO>> page(@Valid RolePageQuery query) {
        return ApiResponse.success(roleService.page(query));
    }

    @Operation(summary = "角色选择列表")
    @GetMapping("/options")
    public ApiResponse<List<RoleVO>> options() {
        return ApiResponse.success(roleService.options());
    }

    @Operation(summary = "角色详情")
    @GetMapping("/{id}")
    public ApiResponse<RoleVO> detail(@PathVariable Long id) {
        return ApiResponse.success(roleService.getDetail(id));
    }

    @OperLog(title = "角色管理", type = "CREATE")
    @Operation(summary = "新增角色")
    @PostMapping
    public ApiResponse<Void> create(@Valid @RequestBody RoleSaveRequest request) {
        roleService.create(request);
        return ApiResponse.success();
    }

    @OperLog(title = "角色管理", type = "UPDATE")
    @Operation(summary = "修改角色")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @Valid @RequestBody RoleSaveRequest request) {
        roleService.update(id, request);
        return ApiResponse.success();
    }

    @OperLog(title = "角色管理", type = "DELETE")
    @Operation(summary = "删除角色")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        roleService.delete(id);
        return ApiResponse.success();
    }

    @OperLog(title = "角色管理", type = "DELETE")
    @Operation(summary = "批量删除角色")
    @PostMapping("/batch-delete")
    public ApiResponse<Void> deleteBatch(@Valid @RequestBody BatchIdsRequest request) {
        roleService.deleteBatch(request);
        return ApiResponse.success();
    }

    @OperLog(title = "角色管理", type = "UPDATE")
    @Operation(summary = "修改角色状态")
    @PatchMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        roleService.updateStatus(id, request);
        return ApiResponse.success();
    }

    @OperLog(title = "角色管理", type = "UPDATE")
    @Operation(summary = "分配角色菜单")
    @PutMapping("/{id}/menus")
    public ApiResponse<Void> assignMenus(@PathVariable Long id, @RequestBody RoleMenuRequest request) {
        roleService.assignMenus(id, request);
        return ApiResponse.success();
    }
}
