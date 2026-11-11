package com.top.practice_service.controllers;

import com.top.practice_service.models.PracticeLog;
import com.top.practice_service.services.PracticeLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/logs")
public class PracticeLogController {
    @Autowired
    private PracticeLogService logService;

    @PostMapping("/enrollment/{enrollmentId}")
    public ResponseEntity<?> createLog(@PathVariable Long enrollmentId, @RequestBody PracticeLog logRequest, @RequestHeader("X-User-Id") Long studentId, @RequestHeader("X-User-Role") String role){
        if(role == null || (!role.equalsIgnoreCase("ESTUDIANTE"))){
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo los estudiantes pueden registrar horas");
        }

        try{
            PracticeLog savedLog = logService.registerHours(enrollmentId, logRequest, studentId);
            return ResponseEntity.ok(savedLog);
        } catch (RuntimeException e){
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/enrollment/{enrollmentId}/pending")
    public ResponseEntity<?> getPendingLogs(@PathVariable Long enrollmentId, @RequestHeader("X-User-Id") Long professorId, @RequestHeader("X-User-Role") String role) {

        if (role == null || (!role.equalsIgnoreCase("PROFESSOR") && !role.equalsIgnoreCase("PROFESOR"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Solo profesores pueden revisar horas.");
        }
        try {
            return ResponseEntity.ok(logService.getPendingLogs(enrollmentId, professorId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{logId}/status")
    public ResponseEntity<?> changeLogStatus(@PathVariable Long logId, @RequestParam String status, @RequestHeader("X-User-Id") Long professorId, @RequestHeader("X-User-Role") String role) {

        if (role == null || (!role.equalsIgnoreCase("PROFESSOR") && !role.equalsIgnoreCase("PROFESOR"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Solo profesores pueden evaluar horas.");
        }
        try {
            return ResponseEntity.ok(logService.updateLogStatus(logId, status, professorId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/enrollment/{enrollmentId}/dashboard")
    public ResponseEntity<?> getDashboard(@PathVariable Long enrollmentId, @RequestHeader("X-User-Id") Long studentId, @RequestHeader("X-User-Role") String role) {

        if (role == null || (!role.equalsIgnoreCase("ESTUDIANTE"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo estudiantes pueden ver su dashboard.");
        }

        try {
            return ResponseEntity.ok(logService.getStudentDashboard(enrollmentId, studentId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{logId}/request-correction")
    public ResponseEntity<?> requestCorrection(@PathVariable Long logId, @RequestBody String reason,
                                               @RequestHeader(value = "X-User-Role", defaultValue = "ESTUDIANTE") String role) {
        if (!"ESTUDIANTE".equalsIgnoreCase(role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("SOLO ESTUDIANTES");
        try {
            return ResponseEntity.ok(logService.requestCorrection(logId, reason));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{logId}/authorize-correction")
    public ResponseEntity<?> authorizeCorrection(@PathVariable Long logId, @RequestHeader(value = "X-User-Role", defaultValue = "PROFESOR") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("SOLO PROFESORES");
        try {
            return ResponseEntity.ok(logService.authorizeCorrection(logId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{logId}/update-observed")
    public ResponseEntity<?> updateObservedLog(@PathVariable Long logId, @RequestBody PracticeLog updatedData, @RequestHeader(value = "X-User-Role", defaultValue = "ESTUDIANTE") String role) {
        if (!"ESTUDIANTE".equalsIgnoreCase(role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("SOLO ESTUDIANTES");
        try {
            return ResponseEntity.ok(logService.updateObservedLog(logId, updatedData));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{logId}/approve-correction")
    public ResponseEntity<?> approveCorrection(@PathVariable Long logId, @RequestHeader(value = "X-User-Role", defaultValue = "PROFESOR") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("SOLO PROFESORES");
        try {
            return ResponseEntity.ok(logService.approveCorrection(logId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

}
