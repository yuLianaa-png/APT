package com.top.practice_service.controllers;

import com.top.practice_service.models.PracticeLog;
import com.top.practice_service.services.PracticeLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/logs")
public class PracticeLogController {
    @Autowired
    private PracticeLogService logService;

    //estudiante - registra jornada
    @PostMapping("/enrollment/{enrollmentId}")
    public ResponseEntity<?> createLog(@PathVariable Long enrollmentId, @RequestBody PracticeLog logRequest,
                                       @RequestHeader("X-User-Id") Long studentId,
                                       @RequestHeader("X-User-Role") String role) {
        if(role == null || (!role.equalsIgnoreCase("ESTUDIANTE"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo los estudiantes pueden registrar horas");
        }
        try {
            PracticeLog savedLog = logService.registerHours(enrollmentId, logRequest, studentId);
            return ResponseEntity.ok(savedLog);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //estudiante - progreso
    @GetMapping("/enrollment/{enrollmentId}/dashboard")
    public ResponseEntity<?> getDashboard(@PathVariable Long enrollmentId,
                                          @RequestHeader("X-User-Id") Long studentId,
                                          @RequestHeader("X-User-Role") String role) {
        if (role == null || (!role.equalsIgnoreCase("ESTUDIANTE"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo estudiantes pueden ver su dashboard.");
        }
        try {
            return ResponseEntity.ok(logService.getStudentDashboard(enrollmentId, studentId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //estudiante o docente - historial de jornadas de una inscripcion
    @GetMapping("/enrollment/{enrollmentId}")
    public ResponseEntity<?> getLogsByEnrollment(@PathVariable Long enrollmentId,
                                                 @RequestHeader("X-User-Id") Long userId,
                                                 @RequestHeader("X-User-Role") String role) {
        try {
            return ResponseEntity.ok(logService.getLogsByEnrollment(enrollmentId, userId, role));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //estudiante o docente - detalle de una jornada
    @GetMapping("/{logId}")
    public ResponseEntity<?> getLogById(@PathVariable Long logId,
                                        @RequestHeader("X-User-Id") Long userId,
                                        @RequestHeader("X-User-Role") String role) {
        try {
            return ResponseEntity.ok(logService.getLogById(logId, userId, role));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //estudiante - editar jornada por ventana o habilitacion
    @PutMapping("/{logId}")
    public ResponseEntity<?> editLog(@PathVariable Long logId, @RequestBody PracticeLog updatedData,
                                     @RequestHeader(value = "X-User-Id", required = false) Long userId,
                                     @RequestHeader(value = "X-User-Role", defaultValue = "ESTUDIANTE") String role) {
        if (!"ESTUDIANTE".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo estudiantes pueden editar sus jornadas.");
        }
        try {
            if (userId != null) logService.checkLogAccess(logId, userId, role);
            return ResponseEntity.ok(logService.editPracticeLog(logId, updatedData));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //estudiante - solicitar correccion
    @PutMapping("/{logId}/request-correction")
    public ResponseEntity<?> requestCorrection(@PathVariable Long logId, @RequestBody Map<String, String> payload,
                                               @RequestHeader(value = "X-User-Id", required = false) Long userId,
                                               @RequestHeader(value = "X-User-Role", defaultValue = "ESTUDIANTE") String role) {
        if (!"ESTUDIANTE".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo estudiantes pueden solicitar correcciones.");
        }
        try {
            if (userId != null) logService.checkLogAccess(logId, userId, role);
            String reason = payload.get("reason");
            return ResponseEntity.ok(logService.requestCorrection(logId, reason));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //docente - habilita correccion
    @PutMapping("/{logId}/enable-correction")
    public ResponseEntity<?> enableCorrection(@PathVariable Long logId, @RequestBody Map<String, String> payload,
                                              @RequestHeader(value = "X-User-Id", required = false) Long userId,
                                              @RequestHeader(value = "X-User-Role", defaultValue = "PROFESOR") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo profesores pueden habilitar correcciones.");
        }
        try {
            if (userId != null && "PROFESOR".equalsIgnoreCase(role)) logService.checkLogAccess(logId, userId, role);
            String observation = payload.get("observation");
            return ResponseEntity.ok(logService.enableCorrection(logId, observation));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //docente - rechazar correccion
    @PutMapping("/{logId}/reject-correction")
    public ResponseEntity<?> rejectCorrection(@PathVariable Long logId, @RequestBody Map<String, String> payload,
                                              @RequestHeader(value = "X-User-Id", required = false) Long userId,
                                              @RequestHeader(value = "X-User-Role", defaultValue = "PROFESOR") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo profesores pueden rechazar correcciones.");
        }
        try {
            if (userId != null && "PROFESOR".equalsIgnoreCase(role)) logService.checkLogAccess(logId, userId, role);
            String comment = payload.get("comment");
            return ResponseEntity.ok(logService.rejectCorrection(logId, comment));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}

