package cn.ezios.baseapi.modules.system.file.dto;

import cn.ezios.baseapi.modules.system.file.vo.FileVO;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchUploadResult {

    private List<FileVO> succeeded;

    private List<FailedItem> failed;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FailedItem {

        private String fileName;

        private String message;
    }
}
