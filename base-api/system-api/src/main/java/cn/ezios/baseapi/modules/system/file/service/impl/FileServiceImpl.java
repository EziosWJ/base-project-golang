package cn.ezios.baseapi.modules.system.file.service.impl;

import cn.hutool.crypto.SecureUtil;
import cn.hutool.core.io.FileUtil;
import cn.ezios.baseapi.common.enums.ResponseCode;
import cn.ezios.baseapi.common.exception.BusinessException;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.framework.config.SystemProperties;
import cn.ezios.baseapi.modules.system.file.dto.BatchUploadResult;
import cn.ezios.baseapi.modules.system.file.dto.FilePageQuery;
import cn.ezios.baseapi.modules.system.file.dto.FileUpdateRequest;
import cn.ezios.baseapi.modules.system.file.entity.SysFile;
import cn.ezios.baseapi.modules.system.file.mapper.SysFileMapper;
import cn.ezios.baseapi.modules.system.file.service.FileResource;
import cn.ezios.baseapi.modules.system.file.service.FileService;
import cn.ezios.baseapi.modules.system.file.vo.FileVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.BeanUtils;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileServiceImpl implements FileService {

    private static final int STATUS_ENABLED = 1;
    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024;
    private static final DateTimeFormatter DATE_PATH_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd");

    private final SysFileMapper fileMapper;
    private final SystemProperties systemProperties;

    public FileServiceImpl(SysFileMapper fileMapper, SystemProperties systemProperties) {
        this.fileMapper = fileMapper;
        this.systemProperties = systemProperties;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public FileVO upload(MultipartFile file, String businessModule, String remark) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("文件不能为空");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("单文件不能超过 50MB");
        }
        String originalName = StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "file";
        String extension = FileUtil.extName(originalName);
        String storageName = UUID.randomUUID().toString().replace("-", "");
        if (StringUtils.hasText(extension)) {
            storageName = storageName + "." + extension;
        }
        String datePath = DATE_PATH_FORMATTER.format(LocalDate.now());
        Path uploadRoot = Path.of(systemProperties.getFile().getUploadRoot()).toAbsolutePath().normalize();
        Path relativePath = Path.of(datePath, storageName);
        Path targetPath = uploadRoot.resolve(relativePath).normalize();
        if (!targetPath.startsWith(uploadRoot)) {
            throw new BusinessException("非法文件路径");
        }
        try {
            Files.createDirectories(targetPath.getParent());
            file.transferTo(targetPath);
        } catch (IOException ex) {
            throw new BusinessException(ResponseCode.INTERNAL_ERROR.getCode(), "文件保存失败");
        }

        SysFile entity = new SysFile();
        entity.setOriginalName(originalName);
        entity.setStorageName(storageName);
        entity.setExtension(extension);
        entity.setMimeType(file.getContentType());
        entity.setFileSize(file.getSize());
        entity.setFileMd5(md5(file));
        entity.setStoragePath(relativePath.toString());
        entity.setBusinessModule(businessModule);
        entity.setStatus(STATUS_ENABLED);
        entity.setRemark(remark);
        fileMapper.insert(entity);
        entity.setAccessUrl("/api/system/file/" + entity.getId() + "/view");
        fileMapper.updateById(entity);
        return toVO(entity);
    }

    @Override
    public BatchUploadResult uploadBatch(MultipartFile[] files, String businessModule, String remark) {
        if (files == null || files.length == 0) {
            throw new BusinessException("文件不能为空");
        }
        List<FileVO> succeeded = new ArrayList<>();
        List<BatchUploadResult.FailedItem> failed = new ArrayList<>();
        for (MultipartFile file : files) {
            try {
                succeeded.add(upload(file, businessModule, remark));
            } catch (Exception ex) {
                String fileName = file != null && file.getOriginalFilename() != null
                        ? file.getOriginalFilename()
                        : "unknown";
                failed.add(new BatchUploadResult.FailedItem(fileName, ex.getMessage()));
            }
        }
        return new BatchUploadResult(succeeded, failed);
    }

    @Override
    public PageResult<FileVO> page(FilePageQuery query) {
        Page<SysFile> page = fileMapper.selectPage(Page.of(query.getPage(), query.getPageSize()),
                new LambdaQueryWrapper<SysFile>()
                        .like(StringUtils.hasText(query.getOriginalName()), SysFile::getOriginalName, query.getOriginalName())
                        .eq(StringUtils.hasText(query.getBusinessModule()), SysFile::getBusinessModule, query.getBusinessModule())
                        .like(StringUtils.hasText(query.getMimeType()), SysFile::getMimeType, query.getMimeType())
                        .eq(query.getStatus() != null, SysFile::getStatus, query.getStatus())
                        .orderByDesc(SysFile::getCreateTime)
                        .orderByDesc(SysFile::getId));
        return new PageResult<>(page.getRecords().stream().map(this::toVO).toList(),
                page.getTotal(), query.getPage(), query.getPageSize());
    }

    @Override
    public FileVO getDetail(Long id) {
        return toVO(requireFile(id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void update(Long id, FileUpdateRequest request) {
        requireFile(id);
        SysFile file = new SysFile();
        file.setId(id);
        file.setBusinessModule(request.getBusinessModule());
        file.setRemark(request.getRemark());
        fileMapper.updateById(file);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        requireFile(id);
        fileMapper.deleteById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteBatch(BatchIdsRequest request) {
        for (Long id : request.getIds()) {
            delete(id);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateStatus(Long id, StatusUpdateRequest request) {
        requireFile(id);
        SysFile file = new SysFile();
        file.setId(id);
        file.setStatus(request.getStatus());
        fileMapper.updateById(file);
    }

    @Override
    public FileResource download(Long id) {
        SysFile file = requireFile(id);
        return new FileResource(loadResource(file), file.getOriginalName(), file.getMimeType());
    }

    @Override
    public FileResource view(Long id) {
        SysFile file = requireFile(id);
        return new FileResource(loadResource(file), file.getOriginalName(), file.getMimeType());
    }

    private SysFile requireFile(Long id) {
        SysFile file = fileMapper.selectById(id);
        if (file == null) {
            throw new BusinessException(ResponseCode.NOT_FOUND);
        }
        return file;
    }

    private Resource loadResource(SysFile file) {
        try {
            Path uploadRoot = Path.of(systemProperties.getFile().getUploadRoot()).toAbsolutePath().normalize();
            Path path = uploadRoot.resolve(file.getStoragePath()).normalize();
            if (!path.startsWith(uploadRoot)) {
                throw new BusinessException(ResponseCode.NOT_FOUND);
            }
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new BusinessException(ResponseCode.NOT_FOUND);
            }
            return resource;
        } catch (IOException ex) {
            throw new BusinessException(ResponseCode.NOT_FOUND);
        }
    }

    private String md5(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            return SecureUtil.md5(inputStream);
        } catch (IOException ex) {
            throw new BusinessException(ResponseCode.INTERNAL_ERROR.getCode(), "文件摘要计算失败");
        }
    }

    private FileVO toVO(SysFile file) {
        FileVO vo = new FileVO();
        BeanUtils.copyProperties(file, vo);
        return vo;
    }
}
