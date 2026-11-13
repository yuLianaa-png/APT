package com.top.document_service.repositories;

import com.top.document_service.models.LogEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LogEvidenceRepository extends JpaRepository<LogEvidence, Long> {
    List<LogEvidence> findByLogId(Long groupId);
}
