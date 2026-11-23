package com.top.notification_service.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/*
 * Solo acepta peticiones que traigan la clave interna (X-Internal-Secret):
 * las que reenvia el api-gateway y las que hacen los otros microservicios por Feign.
 * Asi nadie puede llamar a este servicio directo e inventar X-User-Id / X-User-Role.
 * Si INTERNAL_SECRET no esta definida (desarrollo local), no se exige.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class InternalSecretFilter extends OncePerRequestFilter {
    private static final String HEADER = "X-Internal-Secret";

    @Value("${internal.secret:}")
    private String internalSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!internalSecret.isBlank() && !matches(request.getHeader(HEADER))) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write("ACCESO DENEGADO.");
            return;
        }
        chain.doFilter(request, response);
    }

    //el ping de disponibilidad (/health) no lleva la clave: lo usa un servicio externo para
    //despertar el servicio en Render antes de las tareas programadas. No expone datos.
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "/health".equals(request.getRequestURI());
    }

    //comparacion en tiempo constante, para no dar pistas sobre la clave
    private boolean matches(String received) {
        if (received == null) return false;
        return MessageDigest.isEqual(
                received.getBytes(StandardCharsets.UTF_8),
                internalSecret.getBytes(StandardCharsets.UTF_8));
    }
}
