package com.top.practice_service.controllers;

import com.top.practice_service.DTO.EvaluationTemplateDTO;
import com.top.practice_service.services.EvaluationTemplateService;
import com.top.practice_service.services.SupervisorEvaluationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.function.Supplier;

//docente - evaluacion del centro de practica de su grupo, cuantas evaluaciones hay y sus pautas
@RestController
@RequestMapping("/api/groups/{groupId}/evaluation")
public class EvaluationTemplateController {
    @Autowired
    private EvaluationTemplateService templateService;
    @Autowired
    private SupervisorEvaluationService evaluationService;

    @GetMapping
    public ResponseEntity<?> getSettings(@PathVariable Long groupId,
                                         @RequestHeader("X-User-Id") Long professorId,
                                         @RequestHeader("X-User-Role") String role) {
        return onlyProfessors(role, () -> templateService.getSettings(groupId, professorId));
    }

    //tipo de evaluacion
    @PutMapping("/mode")
    public ResponseEntity<?> setMode(@PathVariable Long groupId,
                                     @RequestBody Map<String, Object> payload,
                                     @RequestHeader("X-User-Id") Long professorId,
                                     @RequestHeader("X-User-Role") String role) {
        Object mode = payload.get("mode");
        return onlyProfessors(role, () -> templateService.setMode(groupId, professorId, mode == null ? null : mode.toString()));
    }

    //guarda el borrador de la pauta de una evaluacion
    @PutMapping("/templates/{slot}")
    public ResponseEntity<?> saveDraft(@PathVariable Long groupId, @PathVariable String slot,
                                       @RequestBody EvaluationTemplateDTO template,
                                       @RequestHeader("X-User-Id") Long professorId,
                                       @RequestHeader("X-User-Role") String role) {
        return onlyProfessors(role, () -> templateService.saveDraft(groupId, professorId, slot, template));
    }

    @PostMapping("/templates/{slot}/publish")
    public ResponseEntity<?> publish(@PathVariable Long groupId, @PathVariable String slot,
                                     @RequestHeader("X-User-Id") Long professorId,
                                     @RequestHeader("X-User-Role") String role) {
        ResponseEntity<?> response = onlyProfessors(role, () -> templateService.publish(groupId, professorId, slot));
        //los estudiantes que ya llegaron al hito y esperaban esta pauta la reciben ahora
        if (response.getStatusCode().is2xxSuccessful()) {
            try {
                evaluationService.dispatchGroup(groupId);
            } catch (Exception e) {
                System.err.println("No se pudieron enviar las evaluaciones pendientes: " + e.getMessage());
            }
        }
        return response;
    }

    @DeleteMapping("/templates/{slot}/draft")
    public ResponseEntity<?> discardDraft(@PathVariable Long groupId, @PathVariable String slot,
                                          @RequestHeader("X-User-Id") Long professorId,
                                          @RequestHeader("X-User-Role") String role) {
        return onlyProfessors(role, () -> templateService.discardDraft(groupId, professorId, slot));
    }

    private ResponseEntity<?> onlyProfessors(String role, Supplier<?> action) {
        if (!"PROFESOR".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Solo los profesores pueden configurar la evaluación.");
        }
        try {
            return ResponseEntity.ok(action.get());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
