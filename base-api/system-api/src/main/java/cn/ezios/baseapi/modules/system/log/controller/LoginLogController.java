package cn.ezios.baseapi.modules.system.log.controller;

import cn.ezios.baseapi.common.model.ApiResponse;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.framework.log.OperLog;
import cn.ezios.baseapi.modules.system.log.dto.LoginLogPageQuery;
import cn.ezios.baseapi.modules.system.log.service.LogService;
import cn.ezios.baseapi.modules.system.log.vo.LoginLogVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "登录日志")
@Validated
@RestController
@RequestMapping("/api/system/login-log")
public class LoginLogController {

    private final LogService logService;

    public LoginLogController(LogService logService) {
        this.logService = logService;
    }

    @Operation(summary = "登录日志分页")
    @GetMapping("/page")
    public ApiResponse<PageResult<LoginLogVO>> page(@Valid LoginLogPageQuery query) {
        return ApiResponse.success(logService.loginPage(query));
    }

    @Operation(summary = "登录日志详情")
    @GetMapping("/{id}")
    public ApiResponse<LoginLogVO> detail(@PathVariable Long id) {
        return ApiResponse.success(logService.loginDetail(id));
    }

    @OperLog(title = "登录日志", type = "DELETE")
    @Operation(summary = "清空登录日志")
    @DeleteMapping("/clear")
    public ApiResponse<Void> clear() {
        logService.clearLoginLog();
        return ApiResponse.success();
    }
}
