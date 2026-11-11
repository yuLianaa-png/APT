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
@Table(name = "group_documents")
public class GroupDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "group_id", nullable = false)
    private Long groupId;

    @Column(length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "requires_submission")
    private Boolean requiresSubmission;

    @Column(name = "file_type", length = 50)
    private String fileType;

    @Column(name = "file_path", length = 255)
    private String filePath;

    @Column(name = "published_date")
    private LocalDateTime publishedDate = LocalDateTime.now();

    @Column(name = "is_active")
    private Boolean active = true;
}
