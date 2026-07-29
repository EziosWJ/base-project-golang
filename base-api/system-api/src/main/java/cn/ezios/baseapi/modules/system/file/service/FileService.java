package cn.ezios.baseapi.modules.system.file.service;

import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.modules.system.file.dto.BatchUploadResult;
import cn.ezios.baseapi.modules.system.file.dto.FilePageQuery;
import cn.ezios.baseapi.modules.system.file.dto.FileUpdateRequest;
import cn.ezios.baseapi.modules.system.file.vo.FileVO;
import org.springframework.web.multipart.MultipartFile;

public interface FileService {

    FileVO upload(MultipartFile file, String businessModule, String remark);

    BatchUploadResult uploadBatch(MultipartFile[] files, String businessModule, String remark);

    PageResult<FileVO> page(FilePageQuery query);

    FileVO getDetail(Long id);

    void update(Long id, FileUpdateRequest request);

    void delete(Long id);

    void deleteBatch(BatchIdsRequest request);

    void updateStatus(Long id, StatusUpdateRequest request);

    FileResource download(Long id);

    FileResource view(Long id);
}
