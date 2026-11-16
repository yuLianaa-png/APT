package com.top.document_service.controller;

import com.top.document_service.clients.PracticeClient;
import com.top.document_service.models.DocumentSubmission;
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
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {

        if (!"PROFESOR".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("ACCESO DENEGADO: Solo los profesores pueden publicar documentos de grupo.");
        }
        ResponseEntity<?> denied = checkGroupOwner(groupId, userId, role);
        if (denied != null) return denied;

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
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {

        if (!"ESTUDIANTE".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("ACCESO DENEGADO: Solo los estudiantes pueden realizar entregas.");
        }
        //nadie entrega a nombre de otro estudiante
        ResponseEntity<?> denied = checkEnrollmentAccess(enrollmentId, userId, role);
        if (denied != null) return denied;

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
        try {
            if ("PROFESOR".equalsIgnoreCase(role)) {
                var group = practiceClient.getGroupById(groupId);
                if (!group.getIdProfessor().equals(userId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("No tienes acceso a los documentos de este grupo.");
                }
                return null;
            }

            if ("ESTUDIANTE".equalsIgnoreCase(role)) {
                List<Long> studentIds = practiceClient.getStudentIdsByGroup(groupId);
                if (!studentIds.contains(userId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("No estás vinculado a este grupo.");
                }
                return null;
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("El grupo no existe.");
        }
        //cualquier otro rol (o sin rol) no tiene acceso
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO.");
    }

    //solo el docente dueño del grupo puede publicar, reemplazar o pedir correcciones
    private ResponseEntity<?> checkGroupOwner(Long groupId, Long userId, String role) {
        if (!"PROFESOR".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO: Solo el profesor del grupo puede realizar esta acción.");
        }
        return checkGroupAccess(groupId, userId, role);
    }

    //el estudiante solo accede a su inscripcion y el docente solo a las de sus grupos
    private ResponseEntity<?> checkEnrollmentAccess(Long enrollmentId, Long userId, String role) {
        try {
            if ("ESTUDIANTE".equalsIgnoreCase(role)) {
                Long ownerId = practiceClient.getStudentIdByEnrollment(enrollmentId);
                if (ownerId == null || !ownerId.equals(userId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO: Esta inscripción no te pertenece.");
                }
                return null;
            }

            if ("PROFESOR".equalsIgnoreCase(role)) {
                Long groupId = practiceClient.getGroupIdByEnrollment(enrollmentId);
                return checkGroupAccess(groupId, userId, role);
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La inscripción no existe.");
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO.");
    }

    //una evidencia pertenece a la inscripcion de su jornada
    private ResponseEntity<?> checkLogAccess(Long logId, Long userId, String role) {
        try {
            Long enrollmentId = practiceClient.getEnrollmentIdByLog(logId);
            return checkEnrollmentAccess(enrollmentId, userId, role);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La jornada no existe.");
        }
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
    public ResponseEntity<?> getSubmissionsByStudent(@PathVariable Long enrollmentId,
                                                     @RequestHeader("X-User-Id") Long userId,
                                                     @RequestHeader("X-User-Role") String role) {
        ResponseEntity<?> denied = checkEnrollmentAccess(enrollmentId, userId, role);
        if (denied != null) return denied;
        return ResponseEntity.ok(submissionRepo.findByEnrollmentIdAndActiveTrue(enrollmentId));
    }

    //estudiante o docente - todas las versiones de las entregas de una inscripcion
    @GetMapping("/submission/{enrollmentId}/history")
    public ResponseEntity<?> getSubmissionsHistoryByStudent(
            @PathVariable Long enrollmentId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {

        ResponseEntity<?> denied = checkEnrollmentAccess(enrollmentId, userId, role);
        if (denied != null) return denied;
        return ResponseEntity.ok(submissionRepo.findByEnrollmentId(enrollmentId));
    }

    //evidencias de todas las jornadas de una inscripcion, en una sola consulta
    @GetMapping("/evidence/enrollment/{enrollmentId}")
    public ResponseEntity<?> getEvidencesByEnrollment(@PathVariable Long enrollmentId,
                                                      @RequestHeader("X-User-Id") Long userId,
                                                      @RequestHeader("X-User-Role") String role) {
        ResponseEntity<?> denied = checkEnrollmentAccess(enrollmentId, userId, role);
        if (denied != null) return denied;

        List<Long> logIds = practiceClient.getLogIdsByEnrollment(enrollmentId);
        if (logIds == null || logIds.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(logEvidenceRepo.findByLogIdIn(logIds));
    }

    @GetMapping("/evidence/{logId}")
    public ResponseEntity<?> getEvidencesByLog(@PathVariable Long logId,
                                               @RequestHeader("X-User-Id") Long userId,
                                               @RequestHeader("X-User-Role") String role) {
        ResponseEntity<?> denied = checkLogAccess(logId, userId, role);
        if (denied != null) return denied;
        return ResponseEntity.ok(logEvidenceRepo.findByLogId(logId));
    }

    @PostMapping("/evidence")
    public ResponseEntity<?> uploadEvidence(
            @RequestParam("file") MultipartFile file,
            @RequestParam("logId") Long logId,
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {

        if (!"ESTUDIANTE".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("ACCESO DENEGADO: Solo los estudiantes pueden adjuntar evidencias a sus jornadas.");
        }
        //solo a jornadas propias
        ResponseEntity<?> denied = checkLogAccess(logId, userId, role);
        if (denied != null) return denied;

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
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {

        DocumentSubmission submission = submissionRepo.findById(submissionId).orElse(null);
        GroupDocument groupDoc = submission == null ? null
                : groupDocRepo.findById(submission.getGroupDocumentId()).orElse(null);
        if (groupDoc == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("La entrega no existe.");
        }
        ResponseEntity<?> denied = checkGroupOwner(groupDoc.getGroupId(), userId, role);
        if (denied != null) return denied;

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
            @RequestHeader("X-User-Id") Long userId,
            @RequestHeader("X-User-Role") String role) {

        GroupDocument existing = groupDocRepo.findById(groupDocumentId).orElse(null);
        if (existing == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("El documento no existe.");
        }
        ResponseEntity<?> denied = checkGroupOwner(existing.getGroupId(), userId, role);
        if (denied != null) return denied;

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
