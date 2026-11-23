package com.top.practice_service.controllers;

import com.top.practice_service.services.SupervisorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.function.Supplier;

//supervisor del centro de practica de una vinculacion
@RestController
@RequestMapping("/api/enrollments")
public class SupervisorController {
    @Autowired
    private SupervisorService supervisorService;

    @GetMapping("/{enrollmentId}/supervisor")
    public ResponseEntity<?> getSupervisor(@PathVariable Long enrollmentId,
                                           @RequestHeader("X-User-Id") Long userId,
                                           @RequestHeader("X-User-Role") String role) {
        return handle(() -> supervisorService.getSupervisor(enrollmentId, userId, role));
    }

    @PutMapping("/{enrollmentId}/supervisor")
    public ResponseEntity<?> updateSupervisor(@PathVariable Long enrollmentId,
                                              @RequestBody Map<String, Object> payload,
                                              @RequestHeader("X-User-Id") Long userId,
                                              @RequestHeader("X-User-Role") String role) {
        return handle(() -> supervisorService.updateSupervisor(enrollmentId, userId, role,
                textOf(payload.get("name")), textOf(payload.get("position")),
                textOf(payload.get("email")), textOf(payload.get("company"))));
    }

    //docente - enlace para enviarlo por otro medio
    @PostMapping("/{enrollmentId}/supervisor/link")
    public ResponseEntity<?> createLink(@PathVariable Long enrollmentId,
                                        @RequestHeader("X-User-Id") Long professorId,
                                        @RequestHeader("X-User-Role") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role)) return onlyProfessors();
        return handle(() -> supervisorService.createLink(enrollmentId, professorId));
    }

    //docente - envia ahora el correo de validacion
    @PostMapping("/{enrollmentId}/supervisor/send")
    public ResponseEntity<?> sendNow(@PathVariable Long enrollmentId,
                                     @RequestHeader("X-User-Id") Long professorId,
                                     @RequestHeader("X-User-Role") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role)) return onlyProfessors();
        return handle(() -> supervisorService.sendNow(enrollmentId, professorId));
    }

    private ResponseEntity<?> onlyProfessors() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body("Error: Solo los profesores pueden enviar el enlace al supervisor.");
    }

    private ResponseEntity<?> handle(Supplier<?> action) {
        try {
            return ResponseEntity.ok(action.get());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private static String textOf(Object value) {
        return value == null ? null : value.toString();
    }
}
