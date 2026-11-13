package com.top.document_service.services;

import com.top.document_service.clients.NotificationClient;
import com.top.document_service.clients.PracticeClient;
import com.top.document_service.models.DocumentSubmission;
import com.top.document_service.models.GroupDocument;
import com.top.document_service.models.LogEvidence;
import com.top.document_service.repositories.DocumentSubmissionRepository;
import com.top.document_service.repositories.GroupDocumentRepository;
import com.top.document_service.repositories.LogEvidenceRepository;
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class DocumentUploadService {
    @Value("${supabase.url}")
    private String supabaseUrl;
    @Value("${supabase.key}")
    private String supabaseKey;
    @Value("${supabase.bucket}")
    private String bucketName;

    @Autowired
    private GroupDocumentRepository groupDocumentRepository;
    @Autowired
    private DocumentSubmissionRepository submissionRepository;
    @Autowired
    private LogEvidenceRepository logEvidenceRepository;
    @Autowired
    private PracticeClient practiceClient;
    @Autowired
    private NotificationClient notificationClient;


    private String uploadToSupabase(MultipartFile file) throws IOException {
        String cleanFileName = file.getOriginalFilename().replaceAll("[^a-zA-Z0-9.-]", "_");
        String uniqueFileName = UUID.randomUUID().toString() + "_" + cleanFileName;
        String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucketName + "/" + uniqueFileName;

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + supabaseKey);
        headers.setContentType(MediaType.parseMediaType(file.getContentType() != null ? file.getContentType() : "application/octet-stream"));

        HttpEntity<byte[]> requestEntity = new HttpEntity<>(file.getBytes(), headers);
        ResponseEntity<String> response = restTemplate.exchange(uploadUrl, HttpMethod.POST, requestEntity, String.class);

        if (response.getStatusCode().is2xxSuccessful()) {
            return supabaseUrl + "/storage/v1/object/public/" + bucketName + "/" + uniqueFileName;
        } else {
            throw new RuntimeException("Error al subir archivo a Supabase: " + response.getBody());
        }
    }

    public GroupDocument uploadGroupDocument(MultipartFile file, Long groupId, String description, Boolean requiresSubmission) throws IOException {
        String savedPublicUrl = uploadToSupabase(file);

        GroupDocument doc = new GroupDocument();
        doc.setGroupId(groupId);
        doc.setName(file.getOriginalFilename());
        doc.setDescription(description);
        doc.setRequiresSubmission(requiresSubmission);
        doc.setFileType(file.getContentType());
        doc.setFilePath(savedPublicUrl);
        doc.setActive(true);
        doc.setVersion(1);

        GroupDocument savedDoc = groupDocumentRepository.save(doc);

        try {
            List<Long> studentIds = practiceClient.getStudentIdsByGroup(groupId);
            var group = practiceClient.getGroupById(groupId);

            if (studentIds != null && !studentIds.isEmpty()) {
                notificationClient.sendBulkNotification(
                        studentIds,
                        groupId,
                        group.getName(),
                        group.getGroupCode(),
                        "DOCUMENT",
                        "Nuevo documento disponible",
                        "El profesor publicó: " + file.getOriginalFilename(),
                        "/documentos"
                );
            }
        } catch (Exception e) {
            System.err.println("ADVERTENCIA: No se pudieron enviar las notificaciones: " + e.getMessage());
        }

        return savedDoc;
    }

    public DocumentSubmission uploadSubmission(MultipartFile file, Long enrollmentId, Long groupDocId, String comments) throws IOException {
        Optional<DocumentSubmission> existingOpt = submissionRepository.findByEnrollmentIdAndGroupDocumentIdAndActiveTrue(enrollmentId, groupDocId);

        int nextVersion = 1;

        if (existingOpt.isPresent()) {
            DocumentSubmission existing = existingOpt.get();
            if (!"Corrección solicitada".equalsIgnoreCase(existing.getStatus())) {
                throw new IllegalStateException("No puedes reemplazar esta entrega. El docente no ha solicitado una corrección.");
            }

            existing.setActive(false);
            submissionRepository.save(existing);

            nextVersion = (existing.getVersion() != null ? existing.getVersion() : 1) + 1;
        }

        String savedPublicUrl = uploadToSupabase(file);

        DocumentSubmission sub = new DocumentSubmission();
        sub.setEnrollmentId(enrollmentId);
        sub.setGroupDocumentId(groupDocId);
        sub.setName(file.getOriginalFilename());
        sub.setComments(comments);
        sub.setFileType(file.getContentType());
        sub.setFilePath(savedPublicUrl);
        sub.setVersion(nextVersion);
        sub.setActive(true);
        sub.setStatus("Entregado");

        return submissionRepository.save(sub);
    }

    public LogEvidence uploadLogEvidence(MultipartFile file, Long logId) throws IOException {
        String savedPublicUrl = uploadToSupabase(file);

        LogEvidence ev = new LogEvidence();
        ev.setLogId(logId);
        ev.setName(file.getOriginalFilename());
        ev.setFileType(file.getContentType());
        ev.setFilePath(savedPublicUrl);

        return logEvidenceRepository.save(ev);
    }

    public DocumentSubmission requestSubmissionCorrection(Long submissionId, String teacherComment) {
        DocumentSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Entrega no encontrada"));

        if (teacherComment == null || teacherComment.trim().isEmpty()) {
            throw new IllegalArgumentException("El comentario es obligatorio para solicitar una corrección.");
        }

        sub.setStatus("Corrección solicitada");
        sub.setComments(teacherComment);
        DocumentSubmission savedSub = submissionRepository.save(sub);

        try {
            GroupDocument groupDoc = groupDocumentRepository.findById(sub.getGroupDocumentId()).orElse(null);
            if (groupDoc != null) {
                var group = practiceClient.getGroupById(groupDoc.getGroupId());
                Long studentId = practiceClient.getStudentIdByEnrollment(sub.getEnrollmentId());

                notificationClient.sendNotification(
                        studentId,
                        group.getId(),
                        group.getName(),
                        group.getGroupCode(),
                        "CORRECTION",
                        "Corrección Solicitada",
                        "El profesor solicitó una corrección en tu entrega. Comentario: " + teacherComment,
                        "/entregas"
                );
            }
        } catch (Exception e) {
            System.err.println("ADVERTENCIA: No se pudo enviar la notificación al alumno: " + e.getMessage());
        }

        return savedSub;
    }

    public GroupDocument replaceGroupDocument(MultipartFile file, Long groupDocumentId) throws IOException {
        GroupDocument existing = groupDocumentRepository.findById(groupDocumentId)
                .orElseThrow(() -> new RuntimeException("Documento original no encontrado"));

        existing.setActive(false);
        groupDocumentRepository.save(existing);

        String savedPublicUrl = uploadToSupabase(file);

        GroupDocument newDoc = new GroupDocument();
        newDoc.setGroupId(existing.getGroupId());
        newDoc.setName(file.getOriginalFilename());
        newDoc.setDescription(existing.getDescription());
        newDoc.setRequiresSubmission(existing.getRequiresSubmission());
        newDoc.setFileType(file.getContentType());
        newDoc.setFilePath(savedPublicUrl);
        newDoc.setActive(true);
        newDoc.setVersion((existing.getVersion() != null ? existing.getVersion() : 1) + 1);

        return groupDocumentRepository.save(newDoc);
    }

}
