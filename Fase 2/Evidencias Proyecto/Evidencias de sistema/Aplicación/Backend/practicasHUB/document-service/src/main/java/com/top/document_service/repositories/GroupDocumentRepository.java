package com.top.document_service.repositories;

import com.top.document_service.models.GroupDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupDocumentRepository extends JpaRepository<GroupDocument, Long> {
    List<GroupDocument> findByGroupIdAndActiveTrue(Long groupId);
}
