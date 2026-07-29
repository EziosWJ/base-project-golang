package cn.ezios.baseapi.modules.auth.service.impl;

import cn.dev33.satoken.SaManager;
import cn.dev33.satoken.stp.SaTokenInfo;
import cn.dev33.satoken.stp.StpUtil;
import cn.ezios.baseapi.common.enums.ResponseCode;
import cn.ezios.baseapi.common.exception.BusinessException;
import cn.ezios.baseapi.common.util.IpUtil;
import cn.ezios.baseapi.modules.auth.dto.LoginRequest;
import cn.ezios.baseapi.modules.auth.session.LoginUserContext;
import cn.ezios.baseapi.modules.auth.session.LoginUserSession;
import cn.ezios.baseapi.modules.auth.service.AuthService;
import cn.ezios.baseapi.modules.auth.vo.AuthDeptVO;
import cn.ezios.baseapi.modules.auth.vo.AuthMenuVO;
import cn.ezios.baseapi.modules.auth.vo.AuthRoleVO;
import cn.ezios.baseapi.modules.auth.vo.AuthUserVO;
import cn.ezios.baseapi.modules.auth.vo.LoginTokenVO;
import cn.ezios.baseapi.modules.system.dept.entity.SysDept;
import cn.ezios.baseapi.modules.system.dept.mapper.SysDeptMapper;
import cn.ezios.baseapi.modules.system.log.entity.SysLoginLog;
import cn.ezios.baseapi.modules.system.log.mapper.SysLoginLogMapper;
import cn.ezios.baseapi.modules.system.menu.entity.SysMenu;
import cn.ezios.baseapi.modules.system.menu.mapper.SysMenuMapper;
import cn.ezios.baseapi.modules.system.role.entity.SysRole;
import cn.ezios.baseapi.modules.system.role.mapper.SysRoleMapper;
import cn.ezios.baseapi.modules.system.user.entity.SysUser;
import cn.ezios.baseapi.modules.system.user.mapper.SysUserMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AuthServiceImpl implements AuthService {

    private static final int STATUS_ENABLED = 1;
    private static final long ROOT_PARENT_ID = 0L;
    private static final String LOGIN_SUCCESS = "SUCCESS";
    private static final String LOGIN_FAIL = "FAIL";

    private final SysUserMapper userMapper;
    private final SysRoleMapper roleMapper;
    private final SysMenuMapper menuMapper;
    private final SysDeptMapper deptMapper;
    private final SysLoginLogMapper loginLogMapper;
    private final PasswordEncoder passwordEncoder;

    public AuthServiceImpl(SysUserMapper userMapper,
                           SysRoleMapper roleMapper,
                           SysMenuMapper menuMapper,
                           SysDeptMapper deptMapper,
                           SysLoginLogMapper loginLogMapper,
                           PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.roleMapper = roleMapper;
        this.menuMapper = menuMapper;
        this.deptMapper = deptMapper;
        this.loginLogMapper = loginLogMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public LoginTokenVO login(LoginRequest request, HttpServletRequest servletRequest) {
        String loginIp = IpUtil.getClientIp(servletRequest);
        SysUser user = userMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, request.getUsername())
                .last("LIMIT 1"));
        if (user == null) {
            recordLoginLog(request.getUsername(), LOGIN_FAIL, loginIp, servletRequest, "用户不存在");
            throw new BusinessException("用户名或密码错误");
        }
        if (!Objects.equals(user.getStatus(), STATUS_ENABLED)) {
            recordLoginLog(request.getUsername(), LOGIN_FAIL, loginIp, servletRequest, "用户已禁用");
            throw new BusinessException(ResponseCode.FORBIDDEN.getCode(), "用户已禁用");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            recordLoginLog(request.getUsername(), LOGIN_FAIL, loginIp, servletRequest, "密码错误");
            throw new BusinessException("用户名或密码错误");
        }

        StpUtil.login(user.getId());
        LocalDateTime loginTime = LocalDateTime.now();
        user.setLastLoginTime(loginTime);
        user.setLastLoginIp(loginIp);
        userMapper.updateById(user);
        LoginUserContext.setCurrentUser(toLoginUserSession(user, loginIp, loginTime));
        recordLoginLog(user.getUsername(), LOGIN_SUCCESS, loginIp, servletRequest, "登录成功");

        SaTokenInfo tokenInfo = StpUtil.getTokenInfo();
        return new LoginTokenVO(
                tokenInfo.getTokenName(),
                withTokenPrefix(tokenInfo.getTokenValue()),
                tokenInfo.getTokenTimeout()
        );
    }

    @Override
    public void logout() {
        StpUtil.logout();
    }

    @Override
    public AuthUserVO getCurrentUser() {
        SysUser user = requireCurrentUser();
        AuthUserVO vo = new AuthUserVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setAvatar(user.getAvatar());
        vo.setPhone(user.getPhone());
        vo.setEmail(user.getEmail());
        vo.setDept(toDeptVO(user.getDeptId()));
        vo.setRoles(roleMapper.selectEnabledRolesByUserId(user.getId()).stream()
                .map(this::toRoleVO)
                .toList());
        vo.setLastLoginTime(user.getLastLoginTime());
        vo.setLastLoginIp(user.getLastLoginIp());
        return vo;
    }

    @Override
    public List<AuthMenuVO> getCurrentUserMenus() {
        Long userId = StpUtil.getLoginIdAsLong();
        List<AuthMenuVO> menus = menuMapper.selectVisibleMenusByUserId(userId).stream()
                .map(this::toMenuVO)
                .sorted(menuComparator())
                .toList();
        return buildMenuTree(menus);
    }

    private SysUser requireCurrentUser() {
        Long userId = StpUtil.getLoginIdAsLong();
        SysUser user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ResponseCode.NOT_FOUND);
        }
        return user;
    }

    private LoginUserSession toLoginUserSession(SysUser user, String loginIp, LocalDateTime loginTime) {
        return LoginUserSession.of(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getAvatar(),
                user.getPhone(),
                user.getEmail(),
                user.getDeptId(),
                loginIp,
                loginTime
        );
    }

    private AuthDeptVO toDeptVO(Long deptId) {
        if (deptId == null) {
            return null;
        }
        SysDept dept = deptMapper.selectById(deptId);
        if (dept == null) {
            return null;
        }
        AuthDeptVO vo = new AuthDeptVO();
        vo.setId(dept.getId());
        vo.setDeptName(dept.getDeptName());
        vo.setDeptCode(dept.getDeptCode());
        return vo;
    }

    private AuthRoleVO toRoleVO(SysRole role) {
        AuthRoleVO vo = new AuthRoleVO();
        vo.setId(role.getId());
        vo.setRoleName(role.getRoleName());
        vo.setRoleCode(role.getRoleCode());
        return vo;
    }

    private AuthMenuVO toMenuVO(SysMenu menu) {
        AuthMenuVO vo = new AuthMenuVO();
        vo.setId(menu.getId());
        vo.setParentId(menu.getParentId());
        vo.setMenuName(menu.getMenuName());
        vo.setMenuType(menu.getMenuType());
        vo.setPath(menu.getPath());
        vo.setComponent(menu.getComponent());
        vo.setIcon(menu.getIcon());
        vo.setPermissionCode(menu.getPermissionCode());
        vo.setSortOrder(menu.getSortOrder());
        vo.setVisible(menu.getVisible());
        return vo;
    }

    private List<AuthMenuVO> buildMenuTree(List<AuthMenuVO> menus) {
        Map<Long, AuthMenuVO> menuMap = new LinkedHashMap<>();
        for (AuthMenuVO menu : menus) {
            menuMap.put(menu.getId(), menu);
        }
        List<AuthMenuVO> roots = new ArrayList<>();
        for (AuthMenuVO menu : menus) {
            Long parentId = menu.getParentId();
            AuthMenuVO parent = menuMap.get(parentId);
            if (parent == null || Objects.equals(parentId, ROOT_PARENT_ID)) {
                roots.add(menu);
            } else {
                parent.getChildren().add(menu);
            }
        }
        sortMenus(roots);
        return roots;
    }

    private void sortMenus(List<AuthMenuVO> menus) {
        menus.sort(menuComparator());
        for (AuthMenuVO menu : menus) {
            sortMenus(menu.getChildren());
        }
    }

    private Comparator<AuthMenuVO> menuComparator() {
        return Comparator.comparing(AuthMenuVO::getSortOrder, Comparator.nullsLast(Integer::compareTo))
                .thenComparing(AuthMenuVO::getId, Comparator.nullsLast(Long::compareTo));
    }

    private void recordLoginLog(String username,
                                String status,
                                String loginIp,
                                HttpServletRequest request,
                                String message) {
        SysLoginLog loginLog = new SysLoginLog();
        loginLog.setUsername(username);
        loginLog.setLoginStatus(status);
        loginLog.setLoginIp(loginIp);
        loginLog.setUserAgent(request.getHeader("User-Agent"));
        loginLog.setMessage(message);
        loginLog.setLoginTime(LocalDateTime.now());
        loginLogMapper.insert(loginLog);
    }

    private String withTokenPrefix(String tokenValue) {
        String tokenPrefix = SaManager.getConfig().getTokenPrefix();
        if (!StringUtils.hasText(tokenPrefix)) {
            return tokenValue;
        }
        return tokenPrefix + " " + tokenValue;
    }

}
