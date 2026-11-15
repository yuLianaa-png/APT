package com.top.document_service.controller;

import com.top.document_service.clients.PracticeClient;
import com.top.document_service.models.GroupDocument;
import com.top.document_service.repositories.DocumentSubmissionRepository;
import com.top.document_service.repositories.GroupDocumentRepository;
import com.top.document_service.repositories.LogEvidenceRepository;
import com.top.document_service.services.DocumentUploadService;
import com.top.document_service.utils.FileValidatorUtil;
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
    @Autowired
    private PracticeClient practiceClient;

    @PostMapping("/group")
    public ResponseEntity<?> uploadGroupDoc(
            @RequestParam("file") MultipartFile file,
            @RequestParam("groupId") Long groupId,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam("description") String description,
            @RequestParam("requiresSubmission") Boolean requiresSubmission,
            @RequestHeader(value = "X-User-Role", defaultValue = "PROFESOR") String role) {

        if (!"PROFESOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("ACCESO DENEGADO: Solo los profesores pueden publicar documentos de grupo.");
        }

        try {
            FileValidatorUtil.validate(file);
            return ResponseEntity.ok(uploadService.uploadGroupDocument(file, groupId, title, description, requiresSubmission));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Error de validación: " + e.getMessage());
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
            FileValidatorUtil.validate(file);
            return ResponseEntity.ok(uploadService.uploadSubmission(file, enrollmentId, groupDocumentId, comments));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Error de validación: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al subir entrega: " + e.getMessage());
        }
    }

    //el docente solo ve sus grupos y el estudiante solo los grupos a los que esta vinculado
    private ResponseEntity<?> checkGroupAccess(Long groupId, Long userId, String role) {
        if ("PROFESOR".equalsIgnoreCase(role)) {
            var group = practiceClient.getGroupById(groupId);
            if (!group.getIdProfessor().equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("No tienes acceso a los documentos de este grupo.");
            }
        }

        if ("ESTUDIANTE".equalsIgnoreCase(role)) {
            List<Long> studentIds = practiceClient.getStudentIdsByGroup(groupId);
            if (!studentIds.contains(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("No estás vinculado a este grupo.");
            }
        }
        return null;
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<?> getGroupDocuments(
            @PathVariable Long groupId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {

        ResponseEntity<?> denied = checkGroupAccess(groupId, userId, role);
        if (denied != null) return denied;

        return ResponseEntity.ok(groupDocRepo.findByGroupIdAndActiveTrue(groupId));
    }

    //todas las versiones (vigentes y anteriores) de los documentos del grupo
    @GetMapping("/group/{groupId}/history")
    public ResponseEntity<?> getGroupDocumentsHistory(
            @PathVariable Long groupId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {

        ResponseEntity<?> denied = checkGroupAccess(groupId, userId, role);
        if (denied != null) return denied;

        return ResponseEntity.ok(groupDocRepo.findByGroupId(groupId));
    }

    //docente - todas las entregas (con sus versiones) de los documentos del grupo
    @GetMapping("/submission/group/{groupId}/history")
    public ResponseEntity<?> getGroupSubmissionsHistory(
            @PathVariable Long groupId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {

        if (!"PROFESOR".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO: Solo el profesor del grupo puede ver todas las entregas.");
        }
        ResponseEntity<?> denied = checkGroupAccess(groupId, userId, role);
        if (denied != null) return denied;

        List<Long> rootIds = groupDocRepo.findByGroupId(groupId).stream()
                .map(doc -> doc.getRootDocumentId() != null ? doc.getRootDocumentId() : doc.getDocumentId())
                .distinct()
                .toList();
        if (rootIds.isEmpty()) return ResponseEntity.ok(List.of());

        return ResponseEntity.ok(submissionRepo.findByGroupDocumentIdIn(rootIds));
    }

    @GetMapping("/submission/{enrollmentId}")
    public ResponseEntity<?> getSubmissionsByStudent(@PathVariable Long enrollmentId) {
        return ResponseEntity.ok(submissionRepo.findByEnrollmentIdAndActiveTrue(enrollmentId));
    }

    //estudiante o docente - todas las versiones de las entregas de una inscripcion
    @GetMapping("/submission/{enrollmentId}/history")
    public ResponseEntity<?> getSubmissionsHistoryByStudent(
            @PathVariable Long enrollmentId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {

        if ("ESTUDIANTE".equalsIgnoreCase(role)) {
            Long ownerId = practiceClient.getStudentIdByEnrollment(enrollmentId);
            if (ownerId == null || !ownerId.equals(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO: Esta inscripción no te pertenece.");
            }
        }
        return ResponseEntity.ok(submissionRepo.findByEnrollmentId(enrollmentId));
    }

    //evidencias de varias jornadas en una sola consulta (?logIds=1,2,3)
    @GetMapping("/evidence/batch")
    public ResponseEntity<?> getEvidencesByLogs(@RequestParam("logIds") List<Long> logIds) {
        if (logIds == null || logIds.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(logEvidenceRepo.findByLogIdIn(logIds));
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
            FileValidatorUtil.validate(file);
            return ResponseEntity.ok(uploadService.uploadLogEvidence(file, logId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Error de validación: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error al subir evidencia: " + e.getMessage());
        }
    }

    @PutMapping("/submission/{submissionId}/request-correction")
    public ResponseEntity<?> requestSubmissionCorrection(
            @PathVariable Long submissionId,
            @RequestBody java.util.Map<String, String> payload,
            @RequestHeader(value = "X-User-Role", defaultValue = "PROFESOR") String role) {

        if (!"PROFESOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO.");
        }
        try {
            String comment = payload.get("comment");
            return ResponseEntity.ok(uploadService.requestSubmissionCorrection(submissionId, comment));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/group/{groupDocumentId}/replace")
    public ResponseEntity<?> replaceGroupDocument(
            @RequestParam("file") MultipartFile file,
            @PathVariable Long groupDocumentId,
            @RequestHeader(value = "X-User-Role", defaultValue = "PROFESOR") String role) {

        if (!"PROFESOR".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO.");
        }
        try {
            FileValidatorUtil.validate(file);
            return ResponseEntity.ok(uploadService.replaceGroupDocument(file, groupDocumentId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Error de validación: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }
}
