package com.top.practice_service.repositories;

import com.top.practice_service.models.PracticeLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PracticeLogRepository extends JpaRepository<PracticeLog,Long> {
    List<PracticeLog> findByIdEnrollment(Long idEnrollment);
    List<PracticeLog> findByIdEnrollmentAndStatus(Long idEnrollment, String status);
}
