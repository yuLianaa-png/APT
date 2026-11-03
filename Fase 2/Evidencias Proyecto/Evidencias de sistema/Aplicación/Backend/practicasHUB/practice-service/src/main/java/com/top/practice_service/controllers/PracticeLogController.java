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

}
