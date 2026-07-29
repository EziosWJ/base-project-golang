package cn.ezios.baseapi.modules.system.log.controller;

import cn.ezios.baseapi.common.model.ApiResponse;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.framework.log.OperLog;
import cn.ezios.baseapi.modules.system.log.dto.OperLogPageQuery;
import cn.ezios.baseapi.modules.system.log.service.LogService;
import cn.ezios.baseapi.modules.system.log.vo.OperLogVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "操作日志")
@Validated
@RestController
@RequestMapping("/api/system/oper-log")
public class OperLogController {

    private final LogService logService;

    public OperLogController(LogService logService) {
        this.logService = logService;
    }

    @Operation(summary = "操作日志分页")
    @GetMapping("/page")
    public ApiResponse<PageResult<OperLogVO>> page(@Valid OperLogPageQuery query) {
        return ApiResponse.success(logService.operPage(query));
    }

    @Operation(summary = "操作日志详情")
    @GetMapping("/{id}")
    public ApiResponse<OperLogVO> detail(@PathVariable Long id) {
        return ApiResponse.success(logService.operDetail(id));
    }

    @OperLog(title = "操作日志", type = "DELETE")
    @Operation(summary = "清空操作日志")
    @DeleteMapping("/clear")
    public ApiResponse<Void> clear() {
        logService.clearOperLog();
        return ApiResponse.success();
    }
}
