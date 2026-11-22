package com.top.practice_service.repositories;

import com.top.practice_service.models.PracticeMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PracticeMessageRepository extends JpaRepository<PracticeMessage, Long> {
    List<PracticeMessage> findByEnrollmentIdOrderByCreatedAtAsc(Long enrollmentId);
    List<PracticeMessage> findByEnrollmentId(Long enrollmentId);
    //mensajes que el otro participante todavia no lee
    long countByEnrollmentIdAndSenderIdNotAndReadAtIsNull(Long enrollmentId, Long readerId);
}
