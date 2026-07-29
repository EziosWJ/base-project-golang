package cn.ezios.baseapi.modules.system.config.service;

import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.modules.system.config.vo.ConfigByKeyVO;
import cn.ezios.baseapi.modules.system.config.dto.ConfigPageQuery;
import cn.ezios.baseapi.modules.system.config.dto.ConfigSaveRequest;
import cn.ezios.baseapi.modules.system.config.vo.ConfigVO;

public interface ConfigService {

    PageResult<ConfigVO> page(ConfigPageQuery query);

    ConfigVO getDetail(Long id);

    ConfigByKeyVO getByKey(String configKey);

    void create(ConfigSaveRequest request);

    void update(Long id, ConfigSaveRequest request);

    void delete(Long id);

    void deleteBatch(BatchIdsRequest request);

    void updateStatus(Long id, StatusUpdateRequest request);
}
