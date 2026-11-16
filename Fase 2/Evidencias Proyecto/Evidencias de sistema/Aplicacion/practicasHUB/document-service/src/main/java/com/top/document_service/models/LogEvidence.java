package com.top.document_service.models;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "log_evidences")
public class LogEvidence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "evidence_id")
    private Long evidenceId;

    @Column(name = "log_id", nullable = false)
    private Long logId;

    @Column(length = 200)
    private String name;

    @Column(name = "file_type", length = 150)
    private String fileType;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "upload_date")
    private LocalDateTime uploadDate = LocalDateTime.now();
}
