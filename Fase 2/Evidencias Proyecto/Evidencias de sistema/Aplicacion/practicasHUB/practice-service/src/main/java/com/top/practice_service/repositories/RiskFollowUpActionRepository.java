package com.top.practice_service.repositories;

import com.top.practice_service.models.RiskFollowUpAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RiskFollowUpActionRepository extends JpaRepository<RiskFollowUpAction, Long> {
    List<RiskFollowUpAction> findByEnrollmentIdOrderByCreatedAtDesc(Long enrollmentId);
    List<RiskFollowUpAction> findByEnrollmentId(Long enrollmentId);
    boolean existsByFollowUpId(Long followUpId);
}
