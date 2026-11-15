package com.top.api_gateway.filter;

import com.top.api_gateway.util.JwtUtil;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import org.springframework.http.server.reactive.ServerHttpRequest;

@Component
public class JwtAuthenticationFilter implements GlobalFilter {
    @Autowired
    private JwtUtil jwtUtil;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain){
        String path = exchange.getRequest().getURI().getPath();

        if (path.startsWith("/api/auth/")){
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String token = authHeader.substring(7);

        try {
            Claims claims = jwtUtil.getClaims(token);
            ServerHttpRequest request = exchange.getRequest().mutate()
                    .header("X-User-Id", claims.get("userId").toString())
                    .header("X-User-Role", claims.get("role").toString())
                    .build();

            return chain.filter(exchange.mutate().request(request).build());

        } catch (Exception e) {
            System.out.println("Fallo de seguridad en Gateway: " + e.getMessage());
            e.printStackTrace();

            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

    }
}
