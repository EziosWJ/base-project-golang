package cn.ezios.baseapi.modules.auth.session;

import cn.dev33.satoken.stp.StpUtil;
import cn.ezios.baseapi.common.enums.ResponseCode;
import cn.ezios.baseapi.common.exception.BusinessException;

public final class LoginUserContext {

    private static final String LOGIN_USER_KEY = "loginUser";

    private LoginUserContext() {
    }

    public static void setCurrentUser(LoginUserSession loginUser) {
        StpUtil.getTokenSession().set(LOGIN_USER_KEY, loginUser);
    }

    public static LoginUserSession requireCurrentUser() {
        Object loginUser = StpUtil.getTokenSession().get(LOGIN_USER_KEY);
        if (loginUser instanceof LoginUserSession session) {
            return session;
        }
        throw new BusinessException(ResponseCode.UNAUTHORIZED);
    }

    public static void refreshCurrentAvatar(String avatar) {
        LoginUserSession loginUser = requireCurrentUser();
        loginUser.setAvatar(avatar);
        StpUtil.getTokenSession().set(LOGIN_USER_KEY, loginUser);
    }
}
