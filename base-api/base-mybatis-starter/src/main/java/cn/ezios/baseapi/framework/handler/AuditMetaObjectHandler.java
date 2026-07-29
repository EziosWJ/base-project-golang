package cn.ezios.baseapi.framework.handler;

import cn.dev33.satoken.stp.StpUtil;
import com.baomidou.mybatisplus.core.handlers.MetaObjectHandler;
import java.time.LocalDateTime;
import org.apache.ibatis.reflection.MetaObject;
import org.springframework.boot.autoconfigure.AutoConfiguration;

@AutoConfiguration
public class AuditMetaObjectHandler implements MetaObjectHandler {

    @Override
    public void insertFill(MetaObject metaObject) {
        LocalDateTime now = LocalDateTime.now();
        strictInsertFill(metaObject, "createTime", LocalDateTime.class, now);
        strictInsertFill(metaObject, "updateTime", LocalDateTime.class, now);
        Long loginId = currentLoginId();
        if (loginId != null) {
            strictInsertFill(metaObject, "createBy", Long.class, loginId);
            strictInsertFill(metaObject, "updateBy", Long.class, loginId);
        }
    }

    @Override
    public void updateFill(MetaObject metaObject) {
        strictUpdateFill(metaObject, "updateTime", LocalDateTime.class, LocalDateTime.now());
        Long loginId = currentLoginId();
        if (loginId != null) {
            strictUpdateFill(metaObject, "updateBy", Long.class, loginId);
        }
    }

    private Long currentLoginId() {
        try {
            return StpUtil.isLogin() ? StpUtil.getLoginIdAsLong() : null;
        } catch (RuntimeException ex) {
            return null;
        }
    }
}
