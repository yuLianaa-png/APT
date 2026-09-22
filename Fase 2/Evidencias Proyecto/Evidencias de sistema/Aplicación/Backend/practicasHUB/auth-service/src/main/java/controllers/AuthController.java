package controllers;

import models.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import security.JwtUtil;
import services.userService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    private userService userService;
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
}
