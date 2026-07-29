package cn.ezios.baseapi;

import cn.ezios.baseapi.framework.config.SystemProperties;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@MapperScan("cn.ezios.baseapi.modules.**.mapper")
@SpringBootApplication
@EnableConfigurationProperties(SystemProperties.class)
public class BaseApiAdminApplication {

    public static void main(String[] args) {
        SpringApplication.run(BaseApiAdminApplication.class, args);
    }
}
