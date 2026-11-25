package com.top.practice_service.controllers;

import com.top.practice_service.DTO.EvaluationAnswersDTO;
import com.top.practice_service.exceptions.InvalidLinkException;
import com.top.practice_service.services.SupervisorEvaluationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.function.Supplier;

@RestController
@RequestMapping("/api/public/evaluation")
public class EvaluationPublicController {
    @Autowired
    private SupervisorEvaluationService evaluationService;

    @GetMapping("/{token}")
    public ResponseEntity<?> view(@PathVariable String token) {
        return handle(() -> evaluationService.publicView(token));
    }

    @PostMapping("/{token}")
    public ResponseEntity<?> submit(@PathVariable String token, @RequestBody EvaluationAnswersDTO answers) {
        return handle(() -> evaluationService.submit(token, answers));
    }

    private ResponseEntity<?> handle(Supplier<?> action) {
        try {
            return ResponseEntity.ok(action.get());
        } catch (InvalidLinkException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
