package com.top.auth_service.controllers;

import com.top.auth_service.DTO.LoginRequest;
import com.top.auth_service.models.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.top.auth_service.security.JwtUtil;
import com.top.auth_service.services.UserService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> RegisterUser(@RequestBody User newUser) {
        try {
            User savedUser = userService.RegisterUser(newUser);

            String token = jwtUtil.generateToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole());
            Map<String, Object> response = new HashMap<>();
            response.put("mensaje", "User registered successfullyS");
            response.put("token", token);

            response.put("id", savedUser.getId());
            response.put("email", savedUser.getEmail());
            response.put("name", savedUser.getName());
            response.put("role", savedUser.getRole().toUpperCase());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> LoginUser(@RequestBody LoginRequest loginRequest) {
        try{
            User userAuth = userService.authenticateUser(loginRequest.getEmail(), loginRequest.getPassword());
            String token = jwtUtil.generateToken(userAuth.getId(), userAuth.getEmail(), userAuth.getRole());
            Map<String, Object> response = new HashMap<>();
            response.put("mensaje", "User logged in successfully");
            response.put("token", token);

            response.put("id", userAuth.getId());
            response.put("email", userAuth.getEmail());
            response.put("name", userAuth.getName());
            response.put("role", userAuth.getRole().toUpperCase());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
    }
}
