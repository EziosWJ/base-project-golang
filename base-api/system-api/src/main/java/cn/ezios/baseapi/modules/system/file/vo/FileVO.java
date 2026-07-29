package cn.ezios.baseapi.modules.system.file.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class FileVO {

    private Long id;

    private String originalName;

    private String storageName;

    private String extension;

    private String mimeType;

    private Long fileSize;

    private String fileMd5;

    private String storagePath;

    private String accessUrl;

    private String businessModule;

    private Integer status;

    private String remark;

    private LocalDateTime createTime;

    private LocalDateTime updateTime;
}
