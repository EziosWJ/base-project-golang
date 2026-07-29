package cn.ezios.baseapi.framework.config;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "base.auth")
public class BaseAuthProperties {

    private List<String> includePaths = new ArrayList<>(List.of("/api/**"));

    private List<String> excludePaths = new ArrayList<>(List.of(
            "/api/auth/login",
            "/doc.html",
            "/webjars/**",
            "/favicon.ico",
            "/swagger-resources/**",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html"
    ));
}
