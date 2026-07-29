package cn.ezios.baseapi.framework.log;

import cn.dev33.satoken.stp.StpUtil;
import cn.ezios.baseapi.common.util.IpUtil;
import cn.ezios.baseapi.modules.system.log.entity.SysOperLog;
import cn.ezios.baseapi.modules.system.log.mapper.SysOperLogMapper;
import cn.ezios.baseapi.modules.system.user.entity.SysUser;
import cn.ezios.baseapi.modules.system.user.mapper.SysUserMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.Arrays;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

@Aspect
@Component
public class OperLogAspect {

    private static final Logger logger = LoggerFactory.getLogger(OperLogAspect.class);
    private static final String SUCCESS = "SUCCESS";
    private static final String FAIL = "FAIL";
    private static final int MAX_TEXT_LENGTH = 2000;

    private final SysOperLogMapper operLogMapper;
    private final SysUserMapper userMapper;
    private final ObjectMapper objectMapper;

    public OperLogAspect(SysOperLogMapper operLogMapper, SysUserMapper userMapper, ObjectMapper objectMapper) {
        this.operLogMapper = operLogMapper;
        this.userMapper = userMapper;
        this.objectMapper = objectMapper;
    }

    @Around("@annotation(cn.ezios.baseapi.framework.log.OperLog)")
    public Object around(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        Throwable error = null;
        Object result = null;
        try {
            result = joinPoint.proceed();
            return result;
        } catch (Throwable ex) {
            error = ex;
            throw ex;
        } finally {
            record(joinPoint, result, error, System.currentTimeMillis() - start);
        }
    }

    private void record(ProceedingJoinPoint joinPoint, Object result, Throwable error, long costTime) {
        try {
            OperLog operLog = ((MethodSignature) joinPoint.getSignature()).getMethod().getAnnotation(OperLog.class);
            HttpServletRequest request = currentRequest();
            SysOperLog log = new SysOperLog();
            log.setModuleName(operLog.title());
            log.setOperationType(operLog.type());
            log.setRequestMethod(request == null ? null : request.getMethod());
            log.setRequestUrl(request == null ? null : request.getRequestURI());
            fillOperator(log);
            log.setOperatorIp(request == null ? null : IpUtil.getClientIp(request));
            log.setRequestParams(mask(truncate(toJson(filterArgs(joinPoint.getArgs())))));
            log.setResponseResult(truncate(toJson(result)));
            log.setCostTime(costTime);
            log.setOperationStatus(error == null ? SUCCESS : FAIL);
            log.setErrorMessage(error == null ? null : truncate(error.getMessage()));
            log.setOperationTime(LocalDateTime.now());
            operLogMapper.insert(log);
        } catch (RuntimeException e) {
            logger.warn("操作日志记录失败", e);
        }
    }

    private void fillOperator(SysOperLog log) {
        try {
            if (StpUtil.isLogin()) {
                Long userId = StpUtil.getLoginIdAsLong();
                log.setOperatorId(userId);
                SysUser user = userMapper.selectById(userId);
                if (user != null) {
                    log.setOperatorName(user.getUsername());
                }
            }
        } catch (RuntimeException e) {
            logger.debug("获取操作人信息失败", e);
        }
    }

    private Object[] filterArgs(Object[] args) {
        return Arrays.stream(args)
                .filter(arg -> !(arg instanceof HttpServletRequest))
                .filter(arg -> !(arg instanceof MultipartFile))
                .filter(arg -> !(arg instanceof MultipartFile[]))
                .toArray();
    }

    private String toJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            return String.valueOf(value);
        }
    }

    private String mask(String value) {
        if (!StringUtils.hasText(value)) {
            return value;
        }
        return value.replaceAll("(?i)(\"(?:password|oldPassword|newPassword|token|authorization)\"\\s*:\\s*\")[^\"]*(\")", "$1******$2");
    }

    private String truncate(String value) {
        if (value == null || value.length() <= MAX_TEXT_LENGTH) {
            return value;
        }
        return value.substring(0, MAX_TEXT_LENGTH);
    }

    private HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            return attributes.getRequest();
        }
        return null;
    }
}
