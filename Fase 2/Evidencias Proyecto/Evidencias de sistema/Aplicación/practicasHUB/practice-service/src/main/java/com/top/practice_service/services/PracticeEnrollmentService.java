package com.top.practice_service.services;

import com.top.practice_service.DTO.GroupStudentDTO;
import com.top.practice_service.clients.AuthClient;
import com.top.practice_service.clients.NotificationClient;
import com.top.practice_service.DTO.StudentEnrollmentDTO;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.models.PracticeLog;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import com.top.practice_service.repositories.PracticeLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PracticeEnrollmentService {
    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;
    @Autowired
    private PracticeGroupRepository groupRepository;
    @Autowired
    private PracticeLogService logService;
    @Autowired
    private PracticeLogRepository logRepository;
    @Autowired
    private NotificationClient notificationClient;
    @Autowired
    private AuthClient authClient;

    //valida codigo existente, grupo activo y que el estudiante no este vinculado
    private PracticeGroup validateGroupForEnrollment(String groupCode, Long studentId) {
        String code = groupCode == null ? "" : groupCode.trim().toUpperCase();

        PracticeGroup group = groupRepository.findByGroupCode(code)
                .orElseThrow(() -> new RuntimeException("El código ingresado no corresponde a ningún grupo de práctica."));

        if (!"Activo".equalsIgnoreCase(group.getStatus())) {
            throw new IllegalStateException("El grupo se encuentra Inactivo. No se permiten nuevas vinculaciones.");
        }

        if (enrollmentRepository.existsByPracticeGroupIdAndStudentId(group.getIdGroup(), studentId)) {
            throw new IllegalStateException("Ya te encuentras vinculado a este grupo de práctica.");
        }
        return group;
    }

    //vista previa del grupo antes de confirmar la vinculacion
    public PracticeGroup previewGroup(String groupCode, Long studentId) {
        return validateGroupForEnrollment(groupCode, studentId);
    }

    public PracticeEnrollment enrollStudent(String groupCode, Long studentId) {

        PracticeGroup group = validateGroupForEnrollment(groupCode, studentId);

        PracticeEnrollment enrollment = new PracticeEnrollment();
        enrollment.setPracticeGroupId(group.getIdGroup());
        enrollment.setStudentId(studentId);
        enrollment.setStatus("ACTIVA");
        enrollment.setEnrollmentDate(LocalDateTime.now());

        PracticeEnrollment savedEnrollment = enrollmentRepository.save(enrollment);

        //avisa al docente que un estudiante nuevo se unio a su grupo
        try {
            String name = authClient.getUserById(studentId).getName();
            notificationClient.sendNotification(
                    group.getIdProfessor(), group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                    "ENROLLMENT", "Nuevo estudiante vinculado",
                    (name != null ? name : "Un estudiante") + " se vinculó al grupo con el código " + group.getGroupCode() + ".",
                    "/estudiantes", group.getIdGroup()
            );
        } catch (Exception e) {
            System.err.println("Error notificando al docente: " + e.getMessage());
        }

        return savedEnrollment;
    }

    public List<StudentEnrollmentDTO> getStudentEnrollments(Long studentId) {
        List<PracticeEnrollment> enrollments = enrollmentRepository.findByStudentId(studentId);
        List<StudentEnrollmentDTO> response = new java.util.ArrayList<>();

        for (PracticeEnrollment enrollment : enrollments) {
            groupRepository.findById(enrollment.getPracticeGroupId()).ifPresent(group -> {
                var dashboardData = logService.getStudentDashboard(enrollment.getEnrollmentId(), enrollment.getStudentId());
                response.add(new StudentEnrollmentDTO(
                        enrollment.getEnrollmentId(),
                        group.getIdGroup(),
                        group.getStatus(),
                        enrollment.getEnrollmentDate(),
                        group.getGroupCode(),
                        group.getCourseName(),
                        group.getDescription(),
                        group.getPeriod(),
                        group.getIdProfessor(),
                        dashboardData.getTotalRegisteredHours(),
                        dashboardData.getRequiredHours(),
                        dashboardData.getTotalLogs(),
                        dashboardData.getPendingRequests(),
                        group.getCreationDate()
                ));
            });
        }
        return response;
    }

    //docente - padron del grupo con el avance de cada estudiante
    public List<GroupStudentDTO> getGroupStudents(Long groupId, Long professorId) {
        PracticeGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Grupo de práctica no encontrado."));

        if (!group.getIdProfessor().equals(professorId)) {
            throw new SecurityException("ACCESO DENEGADO: No eres el profesor de este grupo.");
        }

        List<GroupStudentDTO> response = new java.util.ArrayList<>();
        for (PracticeEnrollment enrollment : enrollmentRepository.findByPracticeGroupId(groupId)) {
            List<PracticeLog> logs = logRepository.findByIdEnrollment(enrollment.getEnrollmentId());

            double hours = logs.stream()
                    .mapToDouble(log -> log.getTotalHours() != null ? log.getTotalHours() : 0.0)
                    .sum();
            int pending = (int) logs.stream().filter(log -> "Pendiente".equalsIgnoreCase(log.getRequestStatus())).count();
            int enabled = (int) logs.stream().filter(log -> "OBSERVADA".equalsIgnoreCase(log.getStatus())).count();

            response.add(new GroupStudentDTO(
                    enrollment.getEnrollmentId(),
                    enrollment.getStudentId(),
                    enrollment.getEnrollmentDate(),
                    logs.size(),
                    Math.round(hours * 100.0) / 100.0,
                    pending,
                    enabled
            ));
        }
        return response;
    }

    public Long getStudentIdByEnrollment(Long enrollmentId) {
        PracticeEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("Inscripción no encontrada."));

        return enrollment.getStudentId();
    }
}
