package com.top.document_service.controller;

import com.top.document_service.services.TemplateParserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

//docente - lee una plantilla de evaluacion y devuelve un borrador de pauta para revisarlo.
@RestController
@RequestMapping("/api/documents/evaluation-templates")
public class TemplateController {
    @Autowired
    private TemplateParserService parserService;

    @PostMapping("/parse")
    public ResponseEntity<?> parse(@RequestParam("file") MultipartFile file,
                                   @RequestHeader("X-User-Id") Long userId,
                                   @RequestHeader("X-User-Role") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO: Solo los profesores pueden subir pautas.");
        }
        try {
            return ResponseEntity.ok(parserService.parse(file));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
