package com.top.api_gateway.filter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/*
 * Agrega la clave interna a TODA peticion que el gateway reenvia a un microservicio.
 * En Render (plan gratis) los microservicios son publicos: con esta cabecera saben que
 * la peticion paso por el gateway y no viene directo de afuera.
 * Si el cliente manda su propia X-Internal-Secret, se reemplaza (o se quita).
 */
@Component
public class InternalSecretFilter implements GlobalFilter, Ordered {
    public static final String HEADER = "X-Internal-Secret";

    @Value("${internal.secret:}")
    private String internalSecret;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest().mutate()
                .headers(headers -> {
                    headers.remove(HEADER);
                    if (!internalSecret.isBlank()) headers.set(HEADER, internalSecret);
                })
                .build();
        return chain.filter(exchange.mutate().request(request).build());
    }

    //se ejecuta antes que los demas filtros
    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
