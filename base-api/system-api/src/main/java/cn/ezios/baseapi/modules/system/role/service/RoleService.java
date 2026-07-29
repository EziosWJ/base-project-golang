package cn.ezios.baseapi.modules.system.role.service;

import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.modules.system.role.dto.RoleMenuRequest;
import cn.ezios.baseapi.modules.system.role.dto.RolePageQuery;
import cn.ezios.baseapi.modules.system.role.dto.RoleSaveRequest;
import cn.ezios.baseapi.modules.system.role.vo.RoleVO;
import java.util.List;

public interface RoleService {

    PageResult<RoleVO> page(RolePageQuery query);

    RoleVO getDetail(Long id);

    void create(RoleSaveRequest request);

    void update(Long id, RoleSaveRequest request);

    void delete(Long id);

    void deleteBatch(BatchIdsRequest request);

    void updateStatus(Long id, StatusUpdateRequest request);

    void assignMenus(Long id, RoleMenuRequest request);

    List<RoleVO> options();
}
