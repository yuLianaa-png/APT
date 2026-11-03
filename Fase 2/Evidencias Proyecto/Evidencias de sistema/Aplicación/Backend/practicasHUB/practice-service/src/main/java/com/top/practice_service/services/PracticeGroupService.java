package com.top.practice_service.services;

import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.repositories.PracticeGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class PracticeGroupService {
    @Autowired
    private PracticeGroupRepository practiceGroupRepository;

    public PracticeGroup createGroup(PracticeGroup group, Long professorId) {
        group.setIdProfessor(professorId);

        if (group.getGroupCode() == null || group.getGroupCode().isEmpty()) {
            String generatedCode = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            group.setGroupCode(generatedCode);
        }

        return practiceGroupRepository.save(group);
    }

    public List<PracticeGroup> getGroupsByProfessor(Long professorId) {
        return practiceGroupRepository.findByIdProfessor(professorId);
    }
}
