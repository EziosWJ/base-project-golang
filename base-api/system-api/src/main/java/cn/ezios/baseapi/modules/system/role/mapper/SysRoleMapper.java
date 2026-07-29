package cn.ezios.baseapi.modules.system.role.mapper;

import cn.ezios.baseapi.modules.system.role.entity.SysRole;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface SysRoleMapper extends BaseMapper<SysRole> {

    @Select("""
            SELECT r.id, r.role_name, r.role_code, r.status, r.sort_order, r.is_builtin,
                   r.remark, r.create_time, r.update_time, r.create_by, r.update_by, r.deleted
            FROM sys_role r
            INNER JOIN sys_user_role ur ON ur.role_id = r.id
            WHERE ur.user_id = #{userId}
              AND r.deleted = 0
              AND r.status = 1
            ORDER BY r.sort_order ASC, r.id ASC
            """)
    List<SysRole> selectEnabledRolesByUserId(@Param("userId") Long userId);
}
