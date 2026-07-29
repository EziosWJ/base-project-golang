package cn.ezios.baseapi.framework.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Data
@ConfigurationProperties(prefix = "system")
public class SystemProperties {

    private String defaultPassword;

    private boolean logClearEnabled;

    private final FileProperties file = new FileProperties();

    @Data
    public static class FileProperties {

        private String uploadRoot = "uploads";
    }
}
