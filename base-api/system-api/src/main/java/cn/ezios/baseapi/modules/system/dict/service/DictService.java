package cn.ezios.baseapi.modules.system.dict.service;

import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.modules.system.dict.dto.DictDataPageQuery;
import cn.ezios.baseapi.modules.system.dict.dto.DictDataSaveRequest;
import cn.ezios.baseapi.modules.system.dict.dto.DictTypePageQuery;
import cn.ezios.baseapi.modules.system.dict.dto.DictTypeSaveRequest;
import cn.ezios.baseapi.modules.system.dict.vo.DictDataVO;
import cn.ezios.baseapi.modules.system.dict.vo.DictItemVO;
import cn.ezios.baseapi.modules.system.dict.vo.DictTypeVO;
import java.util.List;

public interface DictService {

    PageResult<DictTypeVO> typePage(DictTypePageQuery query);

    DictTypeVO typeDetail(Long id);

    void createType(DictTypeSaveRequest request);

    void updateType(Long id, DictTypeSaveRequest request);

    void deleteType(Long id);

    void deleteTypeBatch(BatchIdsRequest request);

    void updateTypeStatus(Long id, StatusUpdateRequest request);

    PageResult<DictDataVO> dataPage(DictDataPageQuery query);

    DictDataVO dataDetail(Long id);

    void createData(DictDataSaveRequest request);

    void updateData(Long id, DictDataSaveRequest request);

    void deleteData(Long id);

    void deleteDataBatch(BatchIdsRequest request);

    List<DictItemVO> items(String dictCode);
}
