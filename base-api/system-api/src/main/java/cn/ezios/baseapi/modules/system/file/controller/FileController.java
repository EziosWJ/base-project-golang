package cn.ezios.baseapi.modules.system.file.controller;

import cn.ezios.baseapi.common.model.ApiResponse;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.framework.log.OperLog;
import cn.ezios.baseapi.modules.system.file.dto.BatchUploadResult;
import cn.ezios.baseapi.modules.system.file.dto.FilePageQuery;
import cn.ezios.baseapi.modules.system.file.dto.FileUpdateRequest;
import cn.ezios.baseapi.modules.system.file.service.FileResource;
import cn.ezios.baseapi.modules.system.file.service.FileService;
import cn.ezios.baseapi.modules.system.file.vo.FileVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "文件管理")
@Validated
@RestController
@RequestMapping("/api/system/file")
public class FileController {

    private final FileService fileService;

    public FileController(FileService fileService) {
        this.fileService = fileService;
    }

    @OperLog(title = "文件管理", type = "CREATE")
    @Operation(summary = "上传文件")
    @PostMapping("/upload")
    public ApiResponse<FileVO> upload(@RequestParam MultipartFile file,
                                      @RequestParam(required = false) String businessModule,
                                      @RequestParam(required = false) String remark) {
        return ApiResponse.success(fileService.upload(file, businessModule, remark));
    }

    @OperLog(title = "文件管理", type = "CREATE")
    @Operation(summary = "批量上传文件")
    @PostMapping("/upload-batch")
    public ApiResponse<BatchUploadResult> uploadBatch(@RequestParam MultipartFile[] files,
                                                      @RequestParam(required = false) String businessModule,
                                                      @RequestParam(required = false) String remark) {
        return ApiResponse.success(fileService.uploadBatch(files, businessModule, remark));
    }

    @Operation(summary = "文件分页")
    @GetMapping("/page")
    public ApiResponse<PageResult<FileVO>> page(@Valid FilePageQuery query) {
        return ApiResponse.success(fileService.page(query));
    }

    @Operation(summary = "文件详情")
    @GetMapping("/{id}")
    public ApiResponse<FileVO> detail(@PathVariable Long id) {
        return ApiResponse.success(fileService.getDetail(id));
    }

    @OperLog(title = "文件管理", type = "UPDATE")
    @Operation(summary = "修改文件元信息")
    @PutMapping("/{id}")
    public ApiResponse<Void> update(@PathVariable Long id, @Valid @RequestBody FileUpdateRequest request) {
        fileService.update(id, request);
        return ApiResponse.success();
    }

    @OperLog(title = "文件管理", type = "DELETE")
    @Operation(summary = "删除文件")
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        fileService.delete(id);
        return ApiResponse.success();
    }

    @OperLog(title = "文件管理", type = "DELETE")
    @Operation(summary = "批量删除文件")
    @PostMapping("/batch-delete")
    public ApiResponse<Void> deleteBatch(@Valid @RequestBody BatchIdsRequest request) {
        fileService.deleteBatch(request);
        return ApiResponse.success();
    }

    @OperLog(title = "文件管理", type = "UPDATE")
    @Operation(summary = "修改文件状态")
    @PatchMapping("/{id}/status")
    public ApiResponse<Void> updateStatus(@PathVariable Long id, @Valid @RequestBody StatusUpdateRequest request) {
        fileService.updateStatus(id, request);
        return ApiResponse.success();
    }

    @Operation(summary = "下载文件")
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) {
        FileResource fr = fileService.download(id);
        String filename = URLEncoder.encode(fr.originalName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + filename)
                .body(fr.resource());
    }

    @Operation(summary = "预览文件")
    @GetMapping("/{id}/view")
    public ResponseEntity<Resource> view(@PathVariable Long id) {
        FileResource fr = fileService.view(id);
        MediaType mediaType = StringUtils.hasText(fr.mimeType())
                ? MediaType.parseMediaType(fr.mimeType())
                : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(fr.originalName(), StandardCharsets.UTF_8).build().toString())
                .body(fr.resource());
    }
}
