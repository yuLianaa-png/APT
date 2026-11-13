package com.top.document_service.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "document_submission")
public class DocumentSubmission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "submission_id")
    private Long submissionId;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "group_document_id")
    private Long groupDocumentId;

    @Column(length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(name = "file_type", length = 150)
    private String fileType;

    @Column(name = "file_path", length = 400)
    private String filePath;

    @Column(name = "submission_date")
    private LocalDateTime submissionDate = LocalDateTime.now();

    @Column(name = "is_active")
    private Boolean active = true;

    @Column(name = "version")
    private Integer version = 1;

    @Column(length = 30)
    private String status = "Entregado";
}
