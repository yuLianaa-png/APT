package com.top.practice_service.repositories;

import com.top.practice_service.models.PracticeGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PracticeGroupRepository extends JpaRepository<PracticeGroup, Long> {
}
