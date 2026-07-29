package cn.ezios.baseapi.modules.auth.service;

import cn.ezios.baseapi.modules.auth.dto.LoginRequest;
import cn.ezios.baseapi.modules.auth.vo.AuthMenuVO;
import cn.ezios.baseapi.modules.auth.vo.AuthUserVO;
import cn.ezios.baseapi.modules.auth.vo.LoginTokenVO;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;

public interface AuthService {

    LoginTokenVO login(LoginRequest request, HttpServletRequest servletRequest);

    void logout();

    AuthUserVO getCurrentUser();

    List<AuthMenuVO> getCurrentUserMenus();
}
