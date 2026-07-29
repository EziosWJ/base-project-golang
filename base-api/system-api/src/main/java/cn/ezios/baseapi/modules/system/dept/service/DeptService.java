package cn.ezios.baseapi.modules.system.dept.service;

import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.modules.system.dept.dto.DeptPageQuery;
import cn.ezios.baseapi.modules.system.dept.dto.DeptSaveRequest;
import cn.ezios.baseapi.modules.system.dept.vo.DeptVO;
import java.util.List;

public interface DeptService {

    List<DeptVO> tree();

    PageResult<DeptVO> page(DeptPageQuery query);

    List<DeptVO> options();

    DeptVO getDetail(Long id);

    void create(DeptSaveRequest request);

    void update(Long id, DeptSaveRequest request);

    void delete(Long id);

    void deleteBatch(BatchIdsRequest request);

    void updateStatus(Long id, StatusUpdateRequest request);
}
