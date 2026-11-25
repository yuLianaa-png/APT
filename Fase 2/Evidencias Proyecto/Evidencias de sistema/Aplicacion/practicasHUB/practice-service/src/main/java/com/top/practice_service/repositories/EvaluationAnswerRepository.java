package com.top.practice_service.repositories;

import com.top.practice_service.models.EvaluationAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EvaluationAnswerRepository extends JpaRepository<EvaluationAnswer, Long> {
    List<EvaluationAnswer> findByEvaluationId(Long evaluationId);
}
