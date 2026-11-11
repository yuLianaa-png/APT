package com.top.practice_service.repositories;

import com.top.practice_service.models.PracticeEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PracticeEnrollmentRepository extends JpaRepository<PracticeEnrollment, Long> {
    boolean existsByPracticeGroupIdAndStudentId(Long practiceGroupId, Long studentId);
    List<PracticeEnrollment> findByPracticeGroupIdAndStatus(Long practiceGroupId, String status);
    List<PracticeEnrollment> findByStudentId(Long studentId);
    List<PracticeEnrollment> findByPracticeGroupId(Long practiceGroupId);
}
