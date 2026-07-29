package cn.ezios.baseapi.modules.system.user.service.impl;

import cn.dev33.satoken.stp.StpUtil;
import cn.ezios.baseapi.common.enums.ResponseCode;
import cn.ezios.baseapi.common.exception.BusinessException;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.framework.config.SystemProperties;
import cn.ezios.baseapi.modules.auth.session.LoginUserContext;
import cn.ezios.baseapi.modules.system.dept.entity.SysDept;
import cn.ezios.baseapi.modules.system.dept.mapper.SysDeptMapper;
import cn.ezios.baseapi.modules.system.role.entity.SysRole;
import cn.ezios.baseapi.modules.system.role.mapper.SysRoleMapper;
import cn.ezios.baseapi.modules.system.user.dto.AvatarUpdateRequest;
import cn.ezios.baseapi.modules.system.user.dto.PasswordChangeRequest;
import cn.ezios.baseapi.modules.system.user.dto.UserPageQuery;
import cn.ezios.baseapi.modules.system.user.dto.UserRoleRequest;
import cn.ezios.baseapi.modules.system.user.dto.UserSaveRequest;
import cn.ezios.baseapi.modules.system.user.dto.UserUpdateRequest;
import cn.ezios.baseapi.modules.system.user.entity.SysUser;
import cn.ezios.baseapi.modules.system.user.entity.SysUserRole;
import cn.ezios.baseapi.modules.system.user.mapper.SysUserMapper;
import cn.ezios.baseapi.modules.system.user.mapper.SysUserRoleMapper;
import cn.ezios.baseapi.modules.system.user.service.UserService;
import cn.ezios.baseapi.modules.system.user.vo.ResetPasswordVO;
import cn.ezios.baseapi.modules.system.user.vo.UserDeptVO;
import cn.ezios.baseapi.modules.system.user.vo.UserRoleVO;
import cn.ezios.baseapi.modules.system.user.vo.UserVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.BeanUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class UserServiceImpl implements UserService {

    private static final int STATUS_ENABLED = 1;
    private static final int BUILTIN = 1;
    private static final String DEFAULT_GENDER = "UNSPECIFIED";

    private final SysUserMapper userMapper;
    private final SysUserRoleMapper userRoleMapper;
    private final SysRoleMapper roleMapper;
    private final SysDeptMapper deptMapper;
    private final PasswordEncoder passwordEncoder;
    private final SystemProperties systemProperties;

    public UserServiceImpl(SysUserMapper userMapper,
                           SysUserRoleMapper userRoleMapper,
                           SysRoleMapper roleMapper,
                           SysDeptMapper deptMapper,
                           PasswordEncoder passwordEncoder,
                           SystemProperties systemProperties) {
        this.userMapper = userMapper;
        this.userRoleMapper = userRoleMapper;
        this.roleMapper = roleMapper;
        this.deptMapper = deptMapper;
        this.passwordEncoder = passwordEncoder;
        this.systemProperties = systemProperties;
    }

    @Override
    public PageResult<UserVO> page(UserPageQuery query) {
        Page<SysUser> page = userMapper.selectPage(Page.of(query.getPage(), query.getPageSize()),
                new LambdaQueryWrapper<SysUser>()
                        .like(StringUtils.hasText(query.getUsername()), SysUser::getUsername, query.getUsername())
                        .like(StringUtils.hasText(query.getNickname()), SysUser::getNickname, query.getNickname())
                        .like(StringUtils.hasText(query.getPhone()), SysUser::getPhone, query.getPhone())
                        .like(StringUtils.hasText(query.getEmail()), SysUser::getEmail, query.getEmail())
                        .eq(query.getStatus() != null, SysUser::getStatus, query.getStatus())
                        .eq(query.getDeptId() != null, SysUser::getDeptId, query.getDeptId())
                        .orderByDesc(SysUser::getCreateTime)
                        .orderByAsc(SysUser::getId));
        return new PageResult<>(page.getRecords().stream().map(this::toVO).toList(),
                page.getTotal(), query.getPage(), query.getPageSize());
    }

    @Override
    public UserVO getDetail(Long id) {
        return toDetailVO(requireUser(id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void create(UserSaveRequest request) {
        ensureUsernameUnique(request.getUsername(), null);
        SysUser user = new SysUser();
        BeanUtils.copyProperties(request, user);
        user.setPassword(passwordEncoder.encode(systemProperties.getDefaultPassword()));
        user.setGender(StringUtils.hasText(request.getGender()) ? request.getGender() : DEFAULT_GENDER);
        user.setStatus(request.getStatus() == null ? STATUS_ENABLED : request.getStatus());
        user.setIsBuiltin(0);
        userMapper.insert(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void update(Long id, UserUpdateRequest request) {
        SysUser existing = requireUser(id);
        SysUser user = new SysUser();
        BeanUtils.copyProperties(request, user);
        user.setId(existing.getId());
        userMapper.updateById(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        SysUser user = requireUser(id);
        if (Objects.equals(user.getIsBuiltin(), BUILTIN)) {
            throw new BusinessException("内置用户禁止删除");
        }
        userMapper.deleteById(id);
        userRoleMapper.delete(new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, id));
        StpUtil.logout(id);
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
        requireUser(id);
        SysUser user = new SysUser();
        user.setId(id);
        user.setStatus(request.getStatus());
        userMapper.updateById(user);
        if (!Objects.equals(request.getStatus(), STATUS_ENABLED)) {
            StpUtil.logout(id);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void assignRoles(Long id, UserRoleRequest request) {
        requireUser(id);
        userRoleMapper.delete(new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, id));
        for (Long roleId : safeIds(request.getRoleIds())) {
            if (roleMapper.selectById(roleId) == null) {
                throw new BusinessException("角色不存在");
            }
            SysUserRole relation = new SysUserRole();
            relation.setUserId(id);
            relation.setRoleId(roleId);
            userRoleMapper.insert(relation);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ResetPasswordVO resetPassword(Long id) {
        requireUser(id);
        String password = systemProperties.getDefaultPassword();
        SysUser user = new SysUser();
        user.setId(id);
        user.setPassword(passwordEncoder.encode(password));
        userMapper.updateById(user);
        StpUtil.logout(id);
        return new ResetPasswordVO(password);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changeCurrentPassword(PasswordChangeRequest request) {
        SysUser user = requireUser(StpUtil.getLoginIdAsLong());
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new BusinessException("旧密码错误");
        }
        SysUser update = new SysUser();
        update.setId(user.getId());
        update.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userMapper.updateById(update);
        StpUtil.logout(user.getId());
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateCurrentAvatar(AvatarUpdateRequest request) {
        SysUser user = requireUser(StpUtil.getLoginIdAsLong());
        SysUser update = new SysUser();
        update.setId(user.getId());
        update.setAvatar(request.getAvatar());
        userMapper.updateById(update);
        LoginUserContext.refreshCurrentAvatar(request.getAvatar());
    }

    private SysUser requireUser(Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) {
            throw new BusinessException(ResponseCode.NOT_FOUND);
        }
        return user;
    }

    private void ensureUsernameUnique(String username, Long excludeId) {
        Long count = userMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username)
                .ne(excludeId != null, SysUser::getId, excludeId));
        if (count > 0) {
            throw new BusinessException("用户名已存在");
        }
    }

    private UserVO toDetailVO(SysUser user) {
        UserVO vo = toVO(user);
        vo.setDept(toDeptVO(user.getDeptId()));
        List<Long> roleIds = userRoleMapper.selectList(new LambdaQueryWrapper<SysUserRole>()
                        .eq(SysUserRole::getUserId, user.getId()))
                .stream()
                .map(SysUserRole::getRoleId)
                .toList();
        if (!roleIds.isEmpty()) {
            vo.setRoles(roleMapper.selectBatchIds(roleIds).stream().map(this::toRoleVO).toList());
        }
        return vo;
    }

    private UserVO toVO(SysUser user) {
        UserVO vo = new UserVO();
        BeanUtils.copyProperties(user, vo);
        return vo;
    }

    private UserDeptVO toDeptVO(Long deptId) {
        if (deptId == null) {
            return null;
        }
        SysDept dept = deptMapper.selectById(deptId);
        if (dept == null) {
            return null;
        }
        UserDeptVO vo = new UserDeptVO();
        vo.setId(dept.getId());
        vo.setDeptName(dept.getDeptName());
        vo.setDeptCode(dept.getDeptCode());
        return vo;
    }

    private UserRoleVO toRoleVO(SysRole role) {
        UserRoleVO vo = new UserRoleVO();
        vo.setId(role.getId());
        vo.setRoleName(role.getRoleName());
        vo.setRoleCode(role.getRoleCode());
        vo.setStatus(role.getStatus());
        return vo;
    }

    private List<Long> safeIds(List<Long> ids) {
        return ids == null ? Collections.emptyList() : ids.stream().distinct().toList();
    }
}
