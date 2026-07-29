package cn.ezios.baseapi.modules.system.role.service.impl;

import cn.ezios.baseapi.common.enums.ResponseCode;
import cn.ezios.baseapi.common.exception.BusinessException;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.modules.system.menu.mapper.SysMenuMapper;
import cn.ezios.baseapi.modules.system.role.dto.RoleMenuRequest;
import cn.ezios.baseapi.modules.system.role.dto.RolePageQuery;
import cn.ezios.baseapi.modules.system.role.dto.RoleSaveRequest;
import cn.ezios.baseapi.modules.system.role.entity.SysRole;
import cn.ezios.baseapi.modules.system.role.entity.SysRoleMenu;
import cn.ezios.baseapi.modules.system.role.mapper.SysRoleMapper;
import cn.ezios.baseapi.modules.system.role.mapper.SysRoleMenuMapper;
import cn.ezios.baseapi.modules.system.role.service.RoleService;
import cn.ezios.baseapi.modules.system.role.vo.RoleVO;
import cn.ezios.baseapi.modules.system.user.entity.SysUserRole;
import cn.ezios.baseapi.modules.system.user.mapper.SysUserRoleMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class RoleServiceImpl implements RoleService {

    private static final int STATUS_ENABLED = 1;
    private static final int BUILTIN = 1;

    private final SysRoleMapper roleMapper;
    private final SysRoleMenuMapper roleMenuMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final SysMenuMapper menuMapper;

    public RoleServiceImpl(SysRoleMapper roleMapper,
                           SysRoleMenuMapper roleMenuMapper,
                           SysUserRoleMapper userRoleMapper,
                           SysMenuMapper menuMapper) {
        this.roleMapper = roleMapper;
        this.roleMenuMapper = roleMenuMapper;
        this.userRoleMapper = userRoleMapper;
        this.menuMapper = menuMapper;
    }

    @Override
    public PageResult<RoleVO> page(RolePageQuery query) {
        Page<SysRole> page = roleMapper.selectPage(Page.of(query.getPage(), query.getPageSize()),
                new LambdaQueryWrapper<SysRole>()
                        .like(StringUtils.hasText(query.getRoleName()), SysRole::getRoleName, query.getRoleName())
                        .like(StringUtils.hasText(query.getRoleCode()), SysRole::getRoleCode, query.getRoleCode())
                        .eq(query.getStatus() != null, SysRole::getStatus, query.getStatus())
                        .orderByAsc(SysRole::getSortOrder)
                        .orderByAsc(SysRole::getId));
        return new PageResult<>(page.getRecords().stream().map(this::toVO).toList(),
                page.getTotal(), query.getPage(), query.getPageSize());
    }

    @Override
    public RoleVO getDetail(Long id) {
        RoleVO vo = toVO(requireRole(id));
        vo.setMenuIds(roleMenuMapper.selectList(new LambdaQueryWrapper<SysRoleMenu>()
                        .eq(SysRoleMenu::getRoleId, id))
                .stream()
                .map(SysRoleMenu::getMenuId)
                .toList());
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void create(RoleSaveRequest request) {
        ensureRoleCodeUnique(request.getRoleCode(), null);
        SysRole role = new SysRole();
        BeanUtils.copyProperties(request, role);
        role.setStatus(request.getStatus() == null ? STATUS_ENABLED : request.getStatus());
        role.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
        role.setIsBuiltin(0);
        roleMapper.insert(role);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void update(Long id, RoleSaveRequest request) {
        SysRole existing = requireRole(id);
        if (Objects.equals(existing.getIsBuiltin(), BUILTIN)
                && !Objects.equals(existing.getRoleCode(), request.getRoleCode())) {
            throw new BusinessException("内置角色禁止修改编码");
        }
        ensureRoleCodeUnique(request.getRoleCode(), id);
        SysRole role = new SysRole();
        BeanUtils.copyProperties(request, role);
        role.setId(id);
        roleMapper.updateById(role);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        SysRole role = requireRole(id);
        if (Objects.equals(role.getIsBuiltin(), BUILTIN)) {
            throw new BusinessException("内置角色禁止删除");
        }
        if (userRoleMapper.selectCount(new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getRoleId, id)) > 0) {
            throw new BusinessException("角色已绑定用户，禁止删除");
        }
        roleMapper.deleteById(id);
        roleMenuMapper.delete(new LambdaQueryWrapper<SysRoleMenu>().eq(SysRoleMenu::getRoleId, id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteBatch(BatchIdsRequest request) {
        for (Long id : request.getIds()) {
            delete(id);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateStatus(Long id, StatusUpdateRequest request) {
        requireRole(id);
        SysRole role = new SysRole();
        role.setId(id);
        role.setStatus(request.getStatus());
        roleMapper.updateById(role);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void assignMenus(Long id, RoleMenuRequest request) {
        requireRole(id);
        roleMenuMapper.delete(new LambdaQueryWrapper<SysRoleMenu>().eq(SysRoleMenu::getRoleId, id));
        for (Long menuId : safeIds(request.getMenuIds())) {
            if (menuMapper.selectById(menuId) == null) {
                throw new BusinessException("菜单不存在");
            }
            SysRoleMenu relation = new SysRoleMenu();
            relation.setRoleId(id);
            relation.setMenuId(menuId);
            roleMenuMapper.insert(relation);
        }
    }

    private SysRole requireRole(Long id) {
        SysRole role = roleMapper.selectById(id);
        if (role == null) {
            throw new BusinessException(ResponseCode.NOT_FOUND);
        }
        return role;
    }

    private void ensureRoleCodeUnique(String roleCode, Long excludeId) {
        Long count = roleMapper.selectCount(new LambdaQueryWrapper<SysRole>()
                .eq(SysRole::getRoleCode, roleCode)
                .ne(excludeId != null, SysRole::getId, excludeId));
        if (count > 0) {
            throw new BusinessException("角色编码已存在");
        }
    }

    private RoleVO toVO(SysRole role) {
        RoleVO vo = new RoleVO();
        BeanUtils.copyProperties(role, vo);
        return vo;
    }

    @Override
    public List<RoleVO> options() {
        return roleMapper.selectList(new LambdaQueryWrapper<SysRole>()
                        .eq(SysRole::getStatus, STATUS_ENABLED)
                        .orderByAsc(SysRole::getSortOrder)
                        .orderByAsc(SysRole::getId))
                .stream()
                .map(this::toVO)
                .toList();
    }

    private List<Long> safeIds(List<Long> ids) {
        return ids == null ? Collections.emptyList() : ids.stream().distinct().toList();
    }
}
