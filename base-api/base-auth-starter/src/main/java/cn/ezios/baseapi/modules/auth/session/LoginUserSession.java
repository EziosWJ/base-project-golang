package cn.ezios.baseapi.modules.auth.session;

import java.io.Serial;
import java.io.Serializable;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class LoginUserSession implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long id;

    private String username;

    private String nickname;

    private String avatar;

    private String phone;

    private String email;

    private Long deptId;

    private String loginIp;

    private LocalDateTime loginTime;

    public static LoginUserSession of(Long id,
                                      String username,
                                      String nickname,
                                      String avatar,
                                      String phone,
                                      String email,
                                      Long deptId,
                                      String loginIp,
                                      LocalDateTime loginTime) {
        LoginUserSession session = new LoginUserSession();
        session.setId(id);
        session.setUsername(username);
        session.setNickname(nickname);
        session.setAvatar(avatar);
        session.setPhone(phone);
        session.setEmail(email);
        session.setDeptId(deptId);
        session.setLoginIp(loginIp);
        session.setLoginTime(loginTime);
        return session;
    }
}
