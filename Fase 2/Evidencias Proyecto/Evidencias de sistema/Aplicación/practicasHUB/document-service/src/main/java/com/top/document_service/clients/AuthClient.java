package com.top.document_service.clients;

import com.top.document_service.DTO.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

//se usa para poner el nombre del estudiante en las notificaciones al docente
@FeignClient(name = "auth-service", url = "http://practicahub-auth:8081")
public interface AuthClient {
    @GetMapping("/api/users/{id}")
    UserDTO getUserById(@PathVariable("id") Long id);
}
