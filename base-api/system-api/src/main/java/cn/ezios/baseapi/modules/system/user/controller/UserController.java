package cn.ezios.baseapi.modules.system.user.controller;

import cn.ezios.baseapi.common.model.ApiResponse;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.framework.log.OperLog;
import cn.ezios.baseapi.modules.system.user.dto.AvatarUpdateRequest;
import cn.ezios.baseapi.modules.system.user.dto.PasswordChangeRequest;
import cn.ezios.baseapi.modules.system.user.dto.UserPageQuery;
import cn.ezios.baseapi.modules.system.user.dto.UserRoleRequest;
import cn.ezios.baseapi.modules.system.user.dto.UserSaveRequest;
import cn.ezios.baseapi.modules.system.user.dto.UserUpdateRequest;
import cn.ezios.baseapi.modules.system.user.service.UserService;
import cn.ezios.baseapi.modules.system.user.vo.ResetPasswordVO;
import cn.ezios.baseapi.modules.system.user.vo.UserVO;
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

@Tag(name = "用户管理")
@Validated
@RestController
@RequestMapping("/api/system/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @Operation(summary = "用户分页")
    @GetMapping("/page")
    public ApiResponse<PageResult<UserVO>> page(@Valid UserPageQuery query) {
        return ApiResponse.success(userService.page(query));
    }

    @Operation(summary = "用户详情")
    @GetMapping("/{id}")
    public ApiResponse<UserVO> detail(@PathVariable Long id) {
        return ApiResponse.success(userService.getDetail(id));
    }

    @OperLog(title = "用户管理", type = "CREATE")
    @Operation(summary = "新增用户")
    @PostMapping
    public ApiResponse<Void> create(@Valid @RequestBody UserSaveRequest request) {
        userService.create(request);
        return ApiResponse.success();
    }

    @OperLog(title = "用户管理", type = "UPDATE")
    @Operation(summary = "修改用户")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request) {
        userService.update(id, request);
        return ApiResponse.success();
    }

    @OperLog(title = "用户管理", type = "DELETE")
    @Operation(summary = "删除用户")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ApiResponse.success();
    }

    @OperLog(title = "用户管理", type = "DELETE")
    @Operation(summary = "批量删除用户")
    @PostMapping("/batch-delete")
    public ApiResponse<Void> deleteBatch(@Valid @RequestBody BatchIdsRequest request) {
        userService.deleteBatch(request);
        return ApiResponse.success();
    }

    @OperLog(title = "用户管理", type = "UPDATE")
    @Operation(summary = "修改用户状态")
    @PatchMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        userService.updateStatus(id, request);
        return ApiResponse.success();
    }

    @OperLog(title = "用户管理", type = "UPDATE")
    @Operation(summary = "分配用户角色")
    @PutMapping("/{id}/roles")
    public ApiResponse<Void> assignRoles(@PathVariable Long id, @RequestBody UserRoleRequest request) {
        userService.assignRoles(id, request);
        return ApiResponse.success();
    }

    @OperLog(title = "用户管理", type = "UPDATE")
    @Operation(summary = "重置用户密码")
    @PutMapping("/{id}/reset-password")
    public ApiResponse<ResetPasswordVO> resetPassword(@PathVariable Long id) {
        return ApiResponse.success(userService.resetPassword(id));
    }

    @OperLog(title = "用户管理", type = "UPDATE")
    @Operation(summary = "当前用户修改密码")
    @PutMapping("/me/password")
    public ApiResponse<Void> changeCurrentPassword(@Valid @RequestBody PasswordChangeRequest request) {
        userService.changeCurrentPassword(request);
        return ApiResponse.success();
    }

    @OperLog(title = "用户管理", type = "UPDATE")
    @Operation(summary = "当前用户修改头像")
    @PutMapping("/me/avatar")
    public ApiResponse<Void> updateCurrentAvatar(@Valid @RequestBody AvatarUpdateRequest request) {
        userService.updateCurrentAvatar(request);
        return ApiResponse.success();
    }
}
