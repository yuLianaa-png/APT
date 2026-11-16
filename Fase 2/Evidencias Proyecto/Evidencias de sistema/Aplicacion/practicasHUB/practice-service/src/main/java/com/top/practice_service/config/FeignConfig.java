package com.top.practice_service.config;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

//todas las llamadas Feign a otros microservicios llevan la clave interna
@Configuration
public class FeignConfig {
    @Value("${internal.secret:}")
    private String internalSecret;

    @Bean
    public RequestInterceptor internalSecretInterceptor() {
        return template -> {
            if (!internalSecret.isBlank()) template.header("X-Internal-Secret", internalSecret);
        };
    }
}
