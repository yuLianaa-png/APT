package com.top.practice_service.controllers;

import com.top.practice_service.services.SupervisorEvaluationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.function.Supplier;

//evaluaciones del supervisor del centro de practica (docente del grupo; el estudiante solo ve las publicadas)
@RestController
@RequestMapping("/api")
public class SupervisorEvaluationController {
    @Autowired
    private SupervisorEvaluationService evaluationService;

    @GetMapping("/enrollments/{enrollmentId}/evaluations")
    public ResponseEntity<?> list(@PathVariable Long enrollmentId,
                                  @RequestHeader("X-User-Id") Long userId,
                                  @RequestHeader("X-User-Role") String role) {
        return handle(() -> evaluationService.listForEnrollment(enrollmentId, userId, role));
    }

    //docente - envia (o reenvia) ahora el correo de evaluacion de un hito (INTERMEDIA o FINAL)
    @PostMapping("/enrollments/{enrollmentId}/evaluations/{milestone}/send")
    public ResponseEntity<?> sendNow(@PathVariable Long enrollmentId, @PathVariable String milestone,
                                     @RequestHeader("X-User-Id") Long professorId,
                                     @RequestHeader("X-User-Role") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role)) return onlyProfessors();
        return handle(() -> evaluationService.sendNow(enrollmentId, milestone, professorId));
    }

    @PostMapping("/enrollments/{enrollmentId}/evaluations/{milestone}/link")
    public ResponseEntity<?> createLink(@PathVariable Long enrollmentId, @PathVariable String milestone,
                                        @RequestHeader("X-User-Id") Long professorId,
                                        @RequestHeader("X-User-Role") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role)) return onlyProfessors();
        return handle(() -> evaluationService.createLink(enrollmentId, milestone, professorId));
    }

    //docente - el estudiante recien ve su evaluacion cuando se publica
    @PostMapping("/enrollments/{enrollmentId}/evaluations/{milestone}/publish")
    public ResponseEntity<?> publish(@PathVariable Long enrollmentId, @PathVariable String milestone,
                                     @RequestHeader("X-User-Id") Long professorId,
                                     @RequestHeader("X-User-Role") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role)) return onlyProfessors();
        return handle(() -> evaluationService.publishToStudent(enrollmentId, milestone, professorId));
    }

    @GetMapping("/groups/{groupId}/evaluation/results")
    public ResponseEntity<?> results(@PathVariable Long groupId,
                                     @RequestHeader("X-User-Id") Long professorId,
                                     @RequestHeader("X-User-Role") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role)) return onlyProfessors();
        return handle(() -> evaluationService.results(groupId, professorId));
    }

    //docente - publica todas las evaluaciones respondidas de un hito
    @PostMapping("/groups/{groupId}/evaluation/results/{milestone}/publish")
    public ResponseEntity<?> publishGroup(@PathVariable Long groupId, @PathVariable String milestone,
                                          @RequestHeader("X-User-Id") Long professorId,
                                          @RequestHeader("X-User-Role") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role)) return onlyProfessors();
        return handle(() -> evaluationService.publishGroup(groupId, milestone, professorId));
    }

    private ResponseEntity<?> onlyProfessors() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Solo los profesores pueden gestionar las evaluaciones.");
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
}
