package cn.ezios.baseapi.framework.config;

import cn.dev33.satoken.interceptor.SaInterceptor;
import cn.dev33.satoken.router.SaHttpMethod;
import cn.dev33.satoken.router.SaRouter;
import cn.dev33.satoken.stp.StpUtil;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@AutoConfiguration
@EnableConfigurationProperties(BaseAuthProperties.class)
public class SaTokenConfig implements WebMvcConfigurer {

    private final BaseAuthProperties authProperties;

    public SaTokenConfig(BaseAuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new SaInterceptor(handle -> SaRouter.match(
                                SaHttpMethod.GET,
                                SaHttpMethod.POST,
                                SaHttpMethod.PUT,
                                SaHttpMethod.DELETE,
                                SaHttpMethod.PATCH)
                        .match(authProperties.getIncludePaths())
                        .notMatch(authProperties.getExcludePaths())
                        .check(StpUtil::checkLogin)))
                .addPathPatterns("/**");
    }
}
