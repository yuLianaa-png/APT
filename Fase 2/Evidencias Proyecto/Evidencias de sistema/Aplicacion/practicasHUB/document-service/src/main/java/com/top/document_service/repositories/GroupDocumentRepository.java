package com.top.document_service.repositories;

import com.top.document_service.models.GroupDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupDocumentRepository extends JpaRepository<GroupDocument, Long> {
    List<GroupDocument> findByGroupIdAndActiveTrue(Long groupId);
    List<GroupDocument> findByGroupId(Long groupId);
    Optional<GroupDocument> findFirstByRootDocumentIdAndActiveTrue(Long rootDocumentId);
}
