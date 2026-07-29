package cn.ezios.baseapi.modules.system.menu.service;

import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.modules.system.menu.dto.MenuPageQuery;
import cn.ezios.baseapi.modules.system.menu.dto.MenuSaveRequest;
import cn.ezios.baseapi.modules.system.menu.vo.MenuVO;
import java.util.List;

public interface MenuService {

    List<MenuVO> tree();

    PageResult<MenuVO> page(MenuPageQuery query);

    MenuVO getDetail(Long id);

    void create(MenuSaveRequest request);

    void update(Long id, MenuSaveRequest request);

    void delete(Long id);

    void deleteBatch(BatchIdsRequest request);

    void updateStatus(Long id, StatusUpdateRequest request);
}
