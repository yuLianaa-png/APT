package com.top.auth_service.controllers;

import com.top.auth_service.models.User;
import com.top.auth_service.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {
    @Autowired
    private UserRepository userRepository;

    /*
     * Un usuario solo puede consultar su propio perfil. Los nombres de los demas llegan al
     * front dentro de las respuestas de practice-service, que ya comprueban si comparten grupo.
     * Las llamadas internas (Feign, sin X-User-Id) si pueden consultar cualquier id.
     */
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id,
                                            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId){
        if (authenticatedUserId != null && !authenticatedUserId.equals(id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
