package cn.ezios.baseapi.modules.system.log.service.impl;

import cn.ezios.baseapi.common.enums.ResponseCode;
import cn.ezios.baseapi.common.exception.BusinessException;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.framework.config.SystemProperties;
import cn.ezios.baseapi.modules.system.log.dto.LoginLogPageQuery;
import cn.ezios.baseapi.modules.system.log.dto.OperLogPageQuery;
import cn.ezios.baseapi.modules.system.log.entity.SysLoginLog;
import cn.ezios.baseapi.modules.system.log.entity.SysOperLog;
import cn.ezios.baseapi.modules.system.log.mapper.SysLoginLogMapper;
import cn.ezios.baseapi.modules.system.log.mapper.SysOperLogMapper;
import cn.ezios.baseapi.modules.system.log.service.LogService;
import cn.ezios.baseapi.modules.system.log.vo.LoginLogVO;
import cn.ezios.baseapi.modules.system.log.vo.OperLogVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class LogServiceImpl implements LogService {

    private final SysLoginLogMapper loginLogMapper;
    private final SysOperLogMapper operLogMapper;
    private final SystemProperties systemProperties;

    public LogServiceImpl(SysLoginLogMapper loginLogMapper,
                          SysOperLogMapper operLogMapper,
                          SystemProperties systemProperties) {
        this.loginLogMapper = loginLogMapper;
        this.operLogMapper = operLogMapper;
        this.systemProperties = systemProperties;
    }

    @Override
    public PageResult<LoginLogVO> loginPage(LoginLogPageQuery query) {
        Page<SysLoginLog> page = loginLogMapper.selectPage(Page.of(query.getPage(), query.getPageSize()),
                new LambdaQueryWrapper<SysLoginLog>()
                        .like(StringUtils.hasText(query.getUsername()), SysLoginLog::getUsername, query.getUsername())
                        .eq(StringUtils.hasText(query.getLoginStatus()), SysLoginLog::getLoginStatus, query.getLoginStatus())
                        .like(StringUtils.hasText(query.getLoginIp()), SysLoginLog::getLoginIp, query.getLoginIp())
                        .orderByDesc(SysLoginLog::getLoginTime)
                        .orderByDesc(SysLoginLog::getId));
        return new PageResult<>(page.getRecords().stream().map(this::toLoginVO).toList(),
                page.getTotal(), query.getPage(), query.getPageSize());
    }

    @Override
    public LoginLogVO loginDetail(Long id) {
        SysLoginLog log = loginLogMapper.selectById(id);
        if (log == null) {
            throw new BusinessException(ResponseCode.NOT_FOUND);
        }
        return toLoginVO(log);
    }

    @Override
    public void clearLoginLog() {
        assertClearEnabled();
        loginLogMapper.delete(new QueryWrapper<>());
    }

    @Override
    public PageResult<OperLogVO> operPage(OperLogPageQuery query) {
        Page<SysOperLog> page = operLogMapper.selectPage(Page.of(query.getPage(), query.getPageSize()),
                new LambdaQueryWrapper<SysOperLog>()
                        .like(StringUtils.hasText(query.getModuleName()), SysOperLog::getModuleName, query.getModuleName())
                        .eq(StringUtils.hasText(query.getOperationType()), SysOperLog::getOperationType, query.getOperationType())
                        .like(StringUtils.hasText(query.getOperatorName()), SysOperLog::getOperatorName, query.getOperatorName())
                        .eq(StringUtils.hasText(query.getOperationStatus()), SysOperLog::getOperationStatus, query.getOperationStatus())
                        .orderByDesc(SysOperLog::getOperationTime)
                        .orderByDesc(SysOperLog::getId));
        return new PageResult<>(page.getRecords().stream().map(this::toOperVO).toList(),
                page.getTotal(), query.getPage(), query.getPageSize());
    }

    @Override
    public OperLogVO operDetail(Long id) {
        SysOperLog log = operLogMapper.selectById(id);
        if (log == null) {
            throw new BusinessException(ResponseCode.NOT_FOUND);
        }
        return toOperVO(log);
    }

    @Override
    public void clearOperLog() {
        assertClearEnabled();
        operLogMapper.delete(new QueryWrapper<>());
    }

    private void assertClearEnabled() {
        if (!systemProperties.isLogClearEnabled()) {
            throw new BusinessException(ResponseCode.FORBIDDEN);
        }
    }

    private LoginLogVO toLoginVO(SysLoginLog log) {
        LoginLogVO vo = new LoginLogVO();
        BeanUtils.copyProperties(log, vo);
        return vo;
    }

    private OperLogVO toOperVO(SysOperLog log) {
        OperLogVO vo = new OperLogVO();
        BeanUtils.copyProperties(log, vo);
        return vo;
    }
}
