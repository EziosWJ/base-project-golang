package cn.ezios.baseapi.modules.system.menu.controller;

import cn.ezios.baseapi.common.model.ApiResponse;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.framework.log.OperLog;
import cn.ezios.baseapi.modules.system.menu.dto.MenuPageQuery;
import cn.ezios.baseapi.modules.system.menu.dto.MenuSaveRequest;
import cn.ezios.baseapi.modules.system.menu.service.MenuService;
import cn.ezios.baseapi.modules.system.menu.vo.MenuVO;
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

@Tag(name = "菜单管理")
@Validated
@RestController
@RequestMapping("/api/system/menu")
public class MenuController {

    private final MenuService menuService;

    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    @Operation(summary = "菜单树")
    @GetMapping("/tree")
    public ApiResponse<List<MenuVO>> tree() {
        return ApiResponse.success(menuService.tree());
    }

    @Operation(summary = "菜单分页")
    @GetMapping("/page")
    public ApiResponse<PageResult<MenuVO>> page(@Valid MenuPageQuery query) {
        return ApiResponse.success(menuService.page(query));
    }

    @Operation(summary = "菜单详情")
    @GetMapping("/{id}")
    public ApiResponse<MenuVO> detail(@PathVariable Long id) {
        return ApiResponse.success(menuService.getDetail(id));
    }

    @OperLog(title = "菜单管理", type = "CREATE")
    @Operation(summary = "新增菜单")
    @PostMapping
    public ApiResponse<Void> create(@Valid @RequestBody MenuSaveRequest request) {
        menuService.create(request);
        return ApiResponse.success();
    }

    @OperLog(title = "菜单管理", type = "UPDATE")
    @Operation(summary = "修改菜单")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @Valid @RequestBody MenuSaveRequest request) {
        menuService.update(id, request);
        return ApiResponse.success();
    }

    @OperLog(title = "菜单管理", type = "DELETE")
    @Operation(summary = "删除菜单")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        menuService.delete(id);
        return ApiResponse.success();
    }

    @OperLog(title = "菜单管理", type = "DELETE")
    @Operation(summary = "批量删除菜单")
    @PostMapping("/batch-delete")
    public ApiResponse<Void> deleteBatch(@Valid @RequestBody BatchIdsRequest request) {
        menuService.deleteBatch(request);
        return ApiResponse.success();
    }

    @OperLog(title = "菜单管理", type = "UPDATE")
    @Operation(summary = "修改菜单状态")
    @PatchMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        menuService.updateStatus(id, request);
        return ApiResponse.success();
    }
}
