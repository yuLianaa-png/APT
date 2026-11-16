package com.top.practice_service.services;

import com.top.practice_service.clients.AuthClient;
import com.top.practice_service.clients.NotificationClient;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import com.top.practice_service.repositories.PracticeLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class PracticeGroupService {
    @Autowired
    private PracticeGroupRepository practiceGroupRepository;
    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;
    @Autowired
    private PracticeLogRepository logRepository;
    @Autowired
    private NotificationClient notificationClient;
    @Autowired
    private AuthClient authClient;

    //nombre de un usuario; si auth-service no responde queda vacio y no se rompe nada
    public String userName(Long userId) {
        try {
            return authClient.getUserById(userId).getName();
        } catch (Exception e) {
            return null;
        }
    }

    //completa el nombre del docente antes de enviar el grupo al front
    public PracticeGroup withProfessorName(PracticeGroup group) {
        group.setProfessorName(userName(group.getIdProfessor()));
        return group;
    }

    //todos los grupos de un docente: su nombre se busca una sola vez
    public List<PracticeGroup> withProfessorName(List<PracticeGroup> groups) {
        if (groups.isEmpty()) return groups;
        String name = userName(groups.get(0).getIdProfessor());
        groups.forEach(group -> group.setProfessorName(name));
        return groups;
    }

    //avisa a todos los estudiantes vinculados al grupo
    private void notifyStudents(PracticeGroup group, String type, String title, String message, Long referenceId) {
        try {
            List<Long> studentIds = enrollmentRepository.findByPracticeGroupId(group.getIdGroup())
                    .stream()
                    .map(PracticeEnrollment::getStudentId)
                    .toList();
            if (studentIds.isEmpty()) return;

            notificationClient.sendBulkNotification(
                    studentIds, group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                    type, title, message, "/resumen", referenceId
            );
        } catch (Exception e) {
            System.err.println("Error notificando a los estudiantes: " + e.getMessage());
        }
    }

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
        if (group.getEndDate() != null && group.getEndDate().isBefore(LocalDate.now(java.time.ZoneId.of("America/Santiago")))) {
            throw new IllegalArgumentException("La fecha de término no puede ser anterior a hoy.");
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

        PracticeGroup savedGroup = practiceGroupRepository.save(group);

        if ("Activo".equalsIgnoreCase(savedGroup.getStatus())) {
            notifyStudents(savedGroup, "GROUP_REACTIVATED", "Práctica reactivada",
                    "El docente reactivó la práctica " + savedGroup.getCourseName() + ". Ya puedes registrar jornadas y entregas.",
                    savedGroup.getIdGroup());
        } else {
            notifyStudents(savedGroup, "GROUP_DEACTIVATED", "Práctica desactivada",
                    "El docente desactivó la práctica " + savedGroup.getCourseName() + ". Queda en solo lectura: puedes consultar todo, pero no registrar ni entregar.",
                    savedGroup.getIdGroup());
        }

        return savedGroup;
    }

    //el docente solo accede a sus grupos y el estudiante solo a los grupos donde esta vinculado
    public boolean canAccessGroup(Long groupId, Long userId, String role) {
        PracticeGroup group = practiceGroupRepository.findById(groupId).orElse(null);
        if (group == null || userId == null) return false;

        if ("PROFESOR".equalsIgnoreCase(role)) {
            return group.getIdProfessor().equals(userId);
        }
        if ("ESTUDIANTE".equalsIgnoreCase(role)) {
            return enrollmentRepository.existsByPracticeGroupIdAndStudentId(groupId, userId);
        }
        return false;
    }

    //docente - define, cambia o quita (null) la fecha de termino de la practica
    public PracticeGroup updateEndDate(Long groupId, Long professorId, LocalDate endDate) {
        PracticeGroup group = practiceGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("El grupo no existe."));

        if (!group.getIdProfessor().equals(professorId)) {
            throw new SecurityException("ACCION DENEGADA: No eres el profesor de este grupo.");
        }
        if (endDate != null && group.getCreationDate() != null
                && endDate.isBefore(group.getCreationDate().toLocalDate())) {
            throw new IllegalArgumentException("La fecha de término no puede ser anterior a la creación del grupo.");
        }

        group.setEndDate(endDate);
        return practiceGroupRepository.save(group);
    }

    public PracticeGroup getGroupById(Long groupId) {
        return practiceGroupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Grupo de práctica no encontrado."));
    }

    //elimina el grupo junto con sus inscripciones y jornadas, para no dejar registros huerfanos
    @Transactional
    public void deleteGroup(Long groupId, Long professorId) {
        PracticeGroup group = practiceGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("El grupo no existe."));

        if (!group.getIdProfessor().equals(professorId)) {
            throw new SecurityException("ACCION DENEGADA: No tienes permiso para eliminar este grupo.");
        }

        //se avisa antes de borrar, mientras todavia se conocen los estudiantes vinculados
        notifyStudents(group, "GROUP_DELETED", "Práctica eliminada",
                "El docente eliminó la práctica " + group.getCourseName() + " (" + group.getGroupCode() + "). Ya no está disponible.",
                null);

        List<PracticeEnrollment> enrollments = enrollmentRepository.findByPracticeGroupId(groupId);
        for (PracticeEnrollment enrollment : enrollments) {
            logRepository.deleteAll(logRepository.findByIdEnrollment(enrollment.getEnrollmentId()));
        }
        enrollmentRepository.deleteAll(enrollments);

        practiceGroupRepository.delete(group);
    }
}
