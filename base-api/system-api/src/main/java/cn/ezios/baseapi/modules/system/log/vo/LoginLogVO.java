package cn.ezios.baseapi.modules.system.log.vo;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class LoginLogVO {

    private Long id;

    private String username;

    private String loginStatus;

    private String loginIp;

    private String loginLocation;

    private String browser;

    private String os;

    private String userAgent;

    private String message;

    private LocalDateTime loginTime;

    private LocalDateTime createTime;
}
