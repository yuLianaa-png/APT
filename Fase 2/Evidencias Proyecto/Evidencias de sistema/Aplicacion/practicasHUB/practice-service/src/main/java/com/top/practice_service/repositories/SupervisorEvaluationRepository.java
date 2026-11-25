package com.top.practice_service.repositories;

import com.top.practice_service.models.SupervisorEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupervisorEvaluationRepository extends JpaRepository<SupervisorEvaluation, Long> {
    List<SupervisorEvaluation> findByEnrollmentId(Long enrollmentId);
    Optional<SupervisorEvaluation> findByEnrollmentIdAndMilestone(Long enrollmentId, String milestone);
    List<SupervisorEvaluation> findByGroupId(Long groupId);
    List<SupervisorEvaluation> findByStatus(String status);
}
