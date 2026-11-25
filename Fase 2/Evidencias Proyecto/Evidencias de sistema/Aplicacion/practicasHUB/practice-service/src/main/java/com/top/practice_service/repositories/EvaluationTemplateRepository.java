package com.top.practice_service.repositories;

import com.top.practice_service.models.EvaluationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EvaluationTemplateRepository extends JpaRepository<EvaluationTemplate, Long> {
    List<EvaluationTemplate> findByGroupId(Long groupId);
    Optional<EvaluationTemplate> findFirstByGroupIdAndSlotAndStatus(Long groupId, String slot, String status);
    boolean existsByGroupIdAndLockedTrue(Long groupId);
}
