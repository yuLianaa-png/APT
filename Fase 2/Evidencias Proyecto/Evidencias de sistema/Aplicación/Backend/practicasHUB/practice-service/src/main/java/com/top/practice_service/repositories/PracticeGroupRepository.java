package com.top.practice_service.repositories;

import com.top.practice_service.models.PracticeGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PracticeGroupRepository extends JpaRepository<PracticeGroup, Long> {
    Optional<PracticeGroup> findByGroupCode(String groupCode);
    List<PracticeGroup> findByIdProfessor(Long idProfessor);
}
