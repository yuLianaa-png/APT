package controllers;

import DTO.LoginRequest;
import models.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import security.JwtUtil;
import services.UserService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private UserService userService;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> RegisterUser(@RequestBody User newUser) {
        try {
            User savedUser = userService.RegisterUser(newUser);

            String token = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getRole());
            Map<String, Object> response = new HashMap<>();
            response.put("mensaje", "User registered successfullyS");
            response.put("token", token);
            response.put("rol", savedUser.getRole());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> LoginUser(@RequestBody LoginRequest loginRequest) {
        try{
            User userAuth = userService.authenticateUser(loginRequest.getEmail(), loginRequest.getPassword());
            String token = jwtUtil.generateToken(userAuth.getEmail(), userAuth.getRole());
            Map<String, Object> response = new HashMap<>();
            response.put("mensaje", "User logged in successfully");
            response.put("token", token);
            response.put("rol", userAuth.getRole());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }
}
