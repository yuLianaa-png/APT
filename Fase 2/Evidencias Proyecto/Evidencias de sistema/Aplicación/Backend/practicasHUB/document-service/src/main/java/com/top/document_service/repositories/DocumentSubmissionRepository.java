package com.top.document_service.repositories;

import com.top.document_service.models.DocumentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentSubmissionRepository extends JpaRepository<DocumentSubmission, Long> {
    List<DocumentSubmission> findByEnrollmentIdAndActiveTrue(Long enrollmentId);
    Optional<DocumentSubmission> findByEnrollmentIdAndGroupDocumentIdAndActiveTrue(Long enrollmentId, Long groupDocumentId);
}
