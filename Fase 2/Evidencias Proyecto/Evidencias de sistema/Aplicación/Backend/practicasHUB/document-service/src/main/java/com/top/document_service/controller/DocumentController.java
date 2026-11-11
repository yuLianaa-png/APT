package com.top.document_service.controller;

import com.top.document_service.models.GroupDocument;
import com.top.document_service.repositories.DocumentSubmissionRepository;
import com.top.document_service.repositories.GroupDocumentRepository;
import com.top.document_service.repositories.LogEvidenceRepository;
import com.top.document_service.services.DocumentUploadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {
    @Autowired
    private DocumentUploadService uploadService;
    @Autowired
    private GroupDocumentRepository groupDocRepo;
    @Autowired
    private DocumentSubmissionRepository submissionRepo;
    @Autowired
    private LogEvidenceRepository logEvidenceRepo;

    @PostMapping("/group")
    public ResponseEntity<?> uploadGroupDoc(
            @RequestParam("file") MultipartFile file,
            @RequestParam("groupId") Long groupId,
            @RequestParam("description") String description,
            @RequestParam("requiresSubmission") Boolean requiresSubmission,
            @RequestHeader(value = "X-User-Role", defaultValue = "PROFESOR") String role) {

        if (!"PROFESOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("ACCESO DENEGADO: Solo los profesores pueden publicar documentos de grupo.");
        }

        try {
            return ResponseEntity.ok(uploadService.uploadGroupDocument(file, groupId, description, requiresSubmission));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al subir documento: " + e.getMessage());
        }
    }


    @PostMapping("/submission")
    public ResponseEntity<?> uploadSubmission(
            @RequestParam("file") MultipartFile file,
            @RequestParam("enrollmentId") Long enrollmentId,
            @RequestParam("groupDocumentId") Long groupDocumentId,
            @RequestParam(value = "comments", required = false) String comments,
            @RequestHeader(value = "X-User-Role", defaultValue = "ESTUDIANTE") String role) {

        if (!"ESTUDIANTE".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("ACCESO DENEGADO: Solo los estudiantes pueden realizar entregas.");
        }

        try {
            return ResponseEntity.ok(uploadService.uploadSubmission(file, enrollmentId, groupDocumentId, comments));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al subir entrega: " + e.getMessage());
        }
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<GroupDocument>> getGroupDocuments(@PathVariable Long groupId) {
        return ResponseEntity.ok(groupDocRepo.findByGroupIdAndActiveTrue(groupId));
    }

    @GetMapping("/submission/{enrollmentId}")
    public ResponseEntity<?> getSubmissionsByStudent(@PathVariable Long enrollmentId) {
        return ResponseEntity.ok(submissionRepo.findByEnrollmentId(enrollmentId));
    }

    @GetMapping("/evidence/{logId}")
    public ResponseEntity<?> getEvidencesByLog(@PathVariable Long logId) {
        return ResponseEntity.ok(logEvidenceRepo.findByLogId(logId));
    }

    @PostMapping("/evidence")
    public ResponseEntity<?> uploadEvidence(
            @RequestParam("file") MultipartFile file,
            @RequestParam("logId") Long logId,
            @RequestHeader(value = "X-User-Role", defaultValue = "ESTUDIANTE") String role) {

        if (!"ESTUDIANTE".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("ACCESO DENEGADO: Solo los estudiantes pueden adjuntar evidencias a sus jornadas.");
        }

        try {
            return ResponseEntity.ok(uploadService.uploadLogEvidence(file, logId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al subir evidencia: " + e.getMessage());
        }
    }
}
