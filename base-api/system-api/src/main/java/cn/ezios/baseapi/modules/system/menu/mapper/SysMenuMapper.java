package cn.ezios.baseapi.modules.system.menu.mapper;

import cn.ezios.baseapi.modules.system.menu.entity.SysMenu;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface SysMenuMapper extends BaseMapper<SysMenu> {

    @Select("""
            SELECT DISTINCT m.id, m.parent_id, m.menu_name, m.menu_type, m.path,
                   m.component, m.external_url, m.icon, m.permission_code, m.sort_order,
                   m.visible, m.status, m.is_builtin, m.remark, m.create_time,
                   m.update_time, m.create_by, m.update_by, m.deleted
            FROM sys_menu m
            INNER JOIN sys_role_menu rm ON rm.menu_id = m.id
            INNER JOIN sys_user_role ur ON ur.role_id = rm.role_id
            INNER JOIN sys_role r ON r.id = ur.role_id
            WHERE ur.user_id = #{userId}
              AND r.deleted = 0
              AND r.status = 1
              AND m.deleted = 0
              AND m.status = 1
              AND m.visible = 1
            ORDER BY m.sort_order ASC, m.id ASC
            """)
    List<SysMenu> selectVisibleMenusByUserId(@Param("userId") Long userId);
}
