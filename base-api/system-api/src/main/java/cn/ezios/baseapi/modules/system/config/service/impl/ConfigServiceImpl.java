package cn.ezios.baseapi.modules.system.config.service.impl;

import cn.ezios.baseapi.common.enums.ResponseCode;
import cn.ezios.baseapi.common.exception.BusinessException;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.modules.system.config.dto.ConfigPageQuery;
import cn.ezios.baseapi.modules.system.config.dto.ConfigSaveRequest;
import cn.ezios.baseapi.modules.system.config.entity.SysConfig;
import cn.ezios.baseapi.modules.system.config.mapper.SysConfigMapper;
import cn.ezios.baseapi.modules.system.config.service.ConfigService;
import cn.ezios.baseapi.modules.system.config.vo.ConfigByKeyVO;
import cn.ezios.baseapi.modules.system.config.vo.ConfigVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.util.Objects;
import org.springframework.beans.BeanUtils;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class ConfigServiceImpl implements ConfigService {

    private static final int STATUS_ENABLED = 1;
    private static final int BUILTIN = 1;
    private static final String DEFAULT_CONFIG_TYPE = "SYSTEM";
    private static final String DEFAULT_VALUE_TYPE = "TEXT";

    private final SysConfigMapper configMapper;

    public ConfigServiceImpl(SysConfigMapper configMapper) {
        this.configMapper = configMapper;
    }

    @Override
    public PageResult<ConfigVO> page(ConfigPageQuery query) {
        Page<SysConfig> page = configMapper.selectPage(Page.of(query.getPage(), query.getPageSize()),
                new LambdaQueryWrapper<SysConfig>()
                        .like(StringUtils.hasText(query.getConfigName()), SysConfig::getConfigName, query.getConfigName())
                        .like(StringUtils.hasText(query.getConfigKey()), SysConfig::getConfigKey, query.getConfigKey())
                        .eq(StringUtils.hasText(query.getConfigType()), SysConfig::getConfigType, query.getConfigType())
                        .eq(query.getStatus() != null, SysConfig::getStatus, query.getStatus())
                        .orderByDesc(SysConfig::getId));
        return new PageResult<>(page.getRecords().stream().map(this::toVO).toList(),
                page.getTotal(), query.getPage(), query.getPageSize());
    }

    @Override
    public ConfigVO getDetail(Long id) {
        return toVO(requireConfig(id));
    }

    @Override
    public ConfigByKeyVO getByKey(String configKey) {
        SysConfig config = configMapper.selectOne(new LambdaQueryWrapper<SysConfig>()
                .eq(SysConfig::getConfigKey, configKey)
                .eq(SysConfig::getDeleted, 0)
                .eq(SysConfig::getStatus, STATUS_ENABLED));
        if (config == null) {
            throw new BusinessException(ResponseCode.NOT_FOUND);
        }
        ConfigByKeyVO vo = new ConfigByKeyVO();
        BeanUtils.copyProperties(config, vo);
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void create(ConfigSaveRequest request) {
        ensureConfigKeyUnique(request.getConfigKey(), null);
        SysConfig config = new SysConfig();
        BeanUtils.copyProperties(request, config);
        config.setConfigType(StringUtils.hasText(request.getConfigType()) ? request.getConfigType() : DEFAULT_CONFIG_TYPE);
        config.setValueType(StringUtils.hasText(request.getValueType()) ? request.getValueType() : DEFAULT_VALUE_TYPE);
        config.setStatus(request.getStatus() == null ? STATUS_ENABLED : request.getStatus());
        config.setIsBuiltin(0);
        try {
            configMapper.insert(config);
        } catch (DuplicateKeyException e) {
            throw new BusinessException("配置键已存在");
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void update(Long id, ConfigSaveRequest request) {
        SysConfig existing = requireConfig(id);
        if (Objects.equals(existing.getIsBuiltin(), BUILTIN)) {
            throw new BusinessException("内置配置项禁止修改");
        }
        ensureConfigKeyUnique(request.getConfigKey(), id);
        SysConfig config = new SysConfig();
        BeanUtils.copyProperties(request, config);
        config.setId(id);
        configMapper.updateById(config);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        SysConfig config = requireConfig(id);
        if (Objects.equals(config.getIsBuiltin(), BUILTIN)) {
            throw new BusinessException("内置配置项禁止删除");
        }
        configMapper.deleteById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteBatch(BatchIdsRequest request) {
        for (Long id : request.getIds()) {
            SysConfig config = configMapper.selectById(id);
            if (config == null || Objects.equals(config.getIsBuiltin(), BUILTIN)) {
                continue;
            }
            configMapper.deleteById(id);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateStatus(Long id, StatusUpdateRequest request) {
        requireConfig(id);
        SysConfig config = new SysConfig();
        config.setId(id);
        config.setStatus(request.getStatus());
        configMapper.updateById(config);
    }

    private SysConfig requireConfig(Long id) {
        SysConfig config = configMapper.selectById(id);
        if (config == null) {
            throw new BusinessException(ResponseCode.NOT_FOUND);
        }
        return config;
    }

    private void ensureConfigKeyUnique(String configKey, Long excludeId) {
        Long count = configMapper.selectCount(new LambdaQueryWrapper<SysConfig>()
                .eq(SysConfig::getConfigKey, configKey)
                .ne(excludeId != null, SysConfig::getId, excludeId));
        if (count > 0) {
            throw new BusinessException("配置键已存在");
        }
    }

    private ConfigVO toVO(SysConfig config) {
        ConfigVO vo = new ConfigVO();
        BeanUtils.copyProperties(config, vo);
        return vo;
    }
}
