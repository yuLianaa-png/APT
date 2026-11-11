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

        GroupDocument savedDoc = groupDocumentRepository.save(doc);

        try {
            List<Long> studentIds = practiceClient.getStudentIdsByGroup(groupId);
            if (studentIds != null && !studentIds.isEmpty()) {
                notificationClient.sendBulkNotification(
                        studentIds,
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
        String savedPublicUrl = uploadToSupabase(file);

        DocumentSubmission sub = new DocumentSubmission();
        sub.setEnrollmentId(enrollmentId);
        sub.setGroupDocumentId(groupDocId);
        sub.setName(file.getOriginalFilename());
        sub.setComments(comments);
        sub.setFileType(file.getContentType());
        sub.setFilePath(savedPublicUrl);

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


}
