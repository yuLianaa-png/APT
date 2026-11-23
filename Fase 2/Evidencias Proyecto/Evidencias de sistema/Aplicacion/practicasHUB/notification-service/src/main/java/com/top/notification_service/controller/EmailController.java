package com.top.notification_service.controller;

import com.top.notification_service.DTO.EmailRequest;
import com.top.notification_service.services.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

//Solo entre microservicios
@RestController
@RequestMapping("/internal/emails")
public class EmailController {
    @Autowired
    private EmailService emailService;

    @PostMapping
    public ResponseEntity<?> send(@RequestBody EmailRequest email,
                                  @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId) {
        if (authenticatedUserId != null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO.");
        }
        try {
            emailService.send(email);
            return ResponseEntity.accepted().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            System.err.println("Brevo rechazó el correo: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body("No se pudo enviar el correo.");
        }
    }
}
