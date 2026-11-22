package com.top.practice_service.repositories;

import com.top.practice_service.models.RiskFollowUp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RiskFollowUpRepository extends JpaRepository<RiskFollowUp, Long> {
    Optional<RiskFollowUp> findFirstByEnrollmentIdAndStatusNotOrderByOpenedAtDesc(Long enrollmentId, String status);
    Optional<RiskFollowUp> findFirstByEnrollmentIdOrderByOpenedAtDesc(Long enrollmentId);
    List<RiskFollowUp> findByEnrollmentId(Long enrollmentId);
}
