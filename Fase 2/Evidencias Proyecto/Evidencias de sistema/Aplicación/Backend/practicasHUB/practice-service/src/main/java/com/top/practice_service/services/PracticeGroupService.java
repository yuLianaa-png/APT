package com.top.practice_service.services;

import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.repositories.PracticeGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PracticeGroupService {
    @Autowired
    private PracticeGroupRepository practiceGroupRepository;

    public PracticeGroup createGroup(PracticeGroup group, Long professorId) {
        if (group.getCourseName() == null || group.getCourseName().trim().isEmpty()) {
            throw new IllegalArgumentException("El nombre del grupo es obligatorio.");
        }
        if (group.getDescription() == null || group.getDescription().trim().isEmpty()) {
            throw new IllegalArgumentException("La descripción del grupo es obligatoria.");
        }
        if (group.getMinimumHours() == null || group.getMinimumHours() <= 0) {
            throw new IllegalArgumentException("La meta mínima de horas es obligatoria y debe ser mayor a 0.");
        }

        group.setIdProfessor(professorId);
        group.setStatus("Activo");
        group.setCreationDate(LocalDateTime.now());

        if (group.getGroupCode() == null || group.getGroupCode().isEmpty()) {
            String generatedCode;
            boolean isUnique = false;

            while (!isUnique) {
                generatedCode = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                if (!practiceGroupRepository.existsByGroupCode(generatedCode)) {
                    group.setGroupCode(generatedCode);
                    isUnique = true;
                }
            }
        }

        return practiceGroupRepository.save(group);
    }

    public List<PracticeGroup> getGroupsByProfessor(Long professorId) {
        return practiceGroupRepository.findByIdProfessor(professorId);
    }

    public PracticeGroup toggleGroupStatus(Long groupId, Long professorId) {
        PracticeGroup group = practiceGroupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grupo no encontrado."));

        if (!group.getIdProfessor().equals(professorId)) {
            throw new RuntimeException("Acceso denegado: No eres el profesor de este grupo.");
        }

        if ("Activo".equalsIgnoreCase(group.getStatus())) {
            group.setStatus("Inactivo");
        } else {
            group.setStatus("Activo");
        }

        return practiceGroupRepository.save(group);
    }

    public PracticeGroup getGroupById(Long groupId) {
        return practiceGroupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grupo de práctica no encontrado."));
    }

    public void deleteGroup(Long groupId, Long professorId) {
        PracticeGroup group = practiceGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("El grupo no existe."));

        if (!group.getIdProfessor().equals(professorId)) {
            throw new SecurityException("ACCION DENEGADA: No tienes permiso para eliminar este grupo.");
        }

        practiceGroupRepository.delete(group);
    }
}
