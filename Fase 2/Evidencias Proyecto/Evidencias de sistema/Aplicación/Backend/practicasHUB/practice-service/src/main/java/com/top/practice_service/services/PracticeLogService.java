package com.top.practice_service.services;

import com.top.practice_service.DTO.StudentDashboardDTO;
import com.top.practice_service.clients.NotificationClient;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.models.PracticeLog;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import com.top.practice_service.repositories.PracticeLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class PracticeLogService {
    @Autowired
    private PracticeLogRepository logRepository;

    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;

    @Autowired
    private PracticeGroupRepository groupRepository;

    @Autowired
    private NotificationClient notificationClient;

    public PracticeLog registerHours(Long enrollmentId, PracticeLog request, Long studentId) {
        PracticeEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("La inscripción no existe."));

        if (!enrollment.getStudentId().equals(studentId)) {
            throw new RuntimeException("ACCESO DENEGADO: Esta inscripción no te pertenece.");
        }
        validateGroupIsActive(enrollmentId);

        if (logRepository.existsByIdEnrollmentAndLogDate(enrollmentId, request.getLogDate())) {
            throw new RuntimeException("Ya existe una jornada registrada para esta fecha en esta práctica.");
        }

        if (request.getEndTime().isBefore(request.getStartTime())) {
            throw new RuntimeException("La hora de término no puede ser anterior a la hora de inicio.");
        }

        Duration duration = Duration.between(request.getStartTime(), request.getEndTime());
        long totalMinutes = duration.toMinutes();
        int breakMins = request.getBreakMinutes() != null ? request.getBreakMinutes() : 0;

        if (breakMins >= totalMinutes) {
            throw new RuntimeException("Los minutos de descanso deben ser menores al tiempo total trabajado para generar horas efectivas.");
        }

        long validMinutes = totalMinutes - breakMins;
        double totalHours = Math.round((validMinutes / 60.0) * 100.0) / 100.0;

        PracticeLog newLog = new PracticeLog();
        newLog.setIdEnrollment(enrollmentId);
        newLog.setLogDate(request.getLogDate());
        newLog.setStartTime(request.getStartTime());
        newLog.setEndTime(request.getEndTime());
        newLog.setBreakMinutes(breakMins);
        newLog.setTotalHours(totalHours);
        newLog.setActivitiesDescription(request.getActivitiesDescription());

        return logRepository.save(newLog);
    }

    public StudentDashboardDTO getStudentDashboard(Long enrollmentId, Long studentId) {
        PracticeEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("La inscripción no existe."));

        if (!enrollment.getStudentId().equals(studentId)) {
            throw new RuntimeException("ACCESO DENEGADO: No puedes ver el progreso de otros estudiantes.");
        }

        com.top.practice_service.models.PracticeGroup group = groupRepository.findById(enrollment.getPracticeGroupId())
                .orElseThrow(() -> new RuntimeException("Grupo no encontrado."));

        int requiredHours = group.getMinimumHours() != null ? group.getMinimumHours() : 0;

        List<PracticeLog> allLogs = logRepository.findByIdEnrollment(enrollmentId);

        double totalRegisteredHours = allLogs.stream()
                .mapToDouble(PracticeLog::getTotalHours)
                .sum();

        double percentage = 0.0;
        if (requiredHours > 0) {
            percentage = Math.round((totalRegisteredHours / requiredHours) * 10000.0) / 100.0;
        }

        return new StudentDashboardDTO(
                enrollmentId,
                totalRegisteredHours,
                requiredHours,
                percentage
        );
    }


    public PracticeLog editPracticeLog(Long logId, PracticeLog updatedData) {
        PracticeLog log = logRepository.findById(logId)
                .orElseThrow(() -> new IllegalArgumentException("Jornada no encontrada"));

        validateGroupIsActive(log.getIdEnrollment());

        boolean isWithinGracePeriod = LocalDateTime.now().isBefore(log.getCreatedAt().plusHours(24));
        boolean isTeacherEnabled = "OBSERVADA".equalsIgnoreCase(log.getStatus());

        if (!isWithinGracePeriod && !isTeacherEnabled) {
            throw new IllegalStateException("Han pasado más de 24 horas. Debes solicitar una corrección al docente para editar esta jornada.");
        }

        Duration duration = Duration.between(updatedData.getStartTime(), updatedData.getEndTime());
        long totalMinutes = duration.toMinutes();
        int breakMins = updatedData.getBreakMinutes() != null ? updatedData.getBreakMinutes() : 0;

        if (breakMins >= totalMinutes) {
            throw new RuntimeException("Los minutos de descanso invalidan el tiempo trabajado.");
        }

        long validMinutes = totalMinutes - breakMins;
        double newTotalHours = Math.round((validMinutes / 60.0) * 100.0) / 100.0;

        log.setStartTime(updatedData.getStartTime());
        log.setEndTime(updatedData.getEndTime());
        log.setBreakMinutes(breakMins);
        log.setTotalHours(newTotalHours);
        log.setActivitiesDescription(updatedData.getActivitiesDescription());

        if (isTeacherEnabled) {
            log.setCorrectionReason(null);
            log.setTeacherObservation(null);
            log.setStatus("REGISTRADA");
            log.setRequestStatus("Completada");
        }

        return logRepository.save(log);
    }

    public PracticeLog requestCorrection(Long logId, String reason) {
        PracticeLog log = logRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Jornada no encontrada"));

        validateGroupIsActive(log.getIdEnrollment());

        if (reason == null || reason.trim().isEmpty()) throw new IllegalArgumentException("Motivo obligatorio.");

        log.setCorrectionReason(reason);
        log.setRequestStatus("Pendiente");

        try {
            PracticeGroup group = groupRepository.findById(log.getIdEnrollment()).orElse(null);
            PracticeEnrollment enrollment = enrollmentRepository.findById(log.getIdEnrollment()).get();
            PracticeGroup groupReal = groupRepository.findById(enrollment.getPracticeGroupId()).get();

            notificationClient.sendNotification(
                    groupReal.getIdProfessor(), groupReal.getIdGroup(), groupReal.getCourseName(), groupReal.getGroupCode(),
                    "CORRECTION_REQUEST", "Nueva solicitud de corrección",
                    "Un estudiante solicitó corregir una jornada. Motivo: " + reason, "/jornadas"
            );
        } catch (Exception e) {
            System.err.println("Error notificando al docente: " + e.getMessage());
        }

        return logRepository.save(log);
    }

    public PracticeLog enableCorrection(Long logId, String observation) {
        PracticeLog log = logRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Jornada no encontrada"));

        validateGroupIsActive(log.getIdEnrollment());

        if (observation == null || observation.trim().isEmpty()) {
            throw new IllegalArgumentException("Debes ingresar una observación breve para habilitar la corrección.");
        }

        log.setTeacherObservation(observation);
        log.setStatus("OBSERVADA");
        log.setRequestStatus("Habilitada");

        try {
            PracticeEnrollment enrollment = enrollmentRepository.findById(log.getIdEnrollment()).get();
            PracticeGroup group = groupRepository.findById(enrollment.getPracticeGroupId()).get();

            notificationClient.sendNotification(
                    enrollment.getStudentId(), group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                    "CORRECTION_REPLY", "Corrección habilitada",
                    "El docente ha respondido a tu solicitud. Observación: " + observation, "/jornadas"
            );
        } catch (Exception e) { System.err.println("Error notificando al estudiante: " + e.getMessage()); }

        return logRepository.save(log);
    }

    public PracticeLog rejectCorrection(Long logId, String comment) {
        PracticeLog log = logRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Jornada no encontrada"));

        validateGroupIsActive(log.getIdEnrollment());

        if (comment == null || comment.trim().isEmpty()) {
            throw new IllegalArgumentException("Debes ingresar un comentario para rechazar.");
        }

        log.setTeacherObservation(comment);
        log.setRequestStatus("Rechazada");

        try {
            PracticeEnrollment enrollment = enrollmentRepository.findById(log.getIdEnrollment()).get();
            com.top.practice_service.models.PracticeGroup group = groupRepository.findById(enrollment.getPracticeGroupId()).get();

            notificationClient.sendNotification(
                    enrollment.getStudentId(), group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                    "CORRECTION_REPLY", "Solicitud rechazada",
                    "El docente ha respondido a tu solicitud. Observación: " + comment, "/jornadas"
            );
        } catch (Exception e) { System.err.println("Error notificando al estudiante: " + e.getMessage()); }

        return logRepository.save(log);
    }

    private void validateGroupIsActive(Long enrollmentId) {
        PracticeEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("Inscripción no encontrada."));

        com.top.practice_service.models.PracticeGroup group = groupRepository.findById(enrollment.getPracticeGroupId())
                .orElseThrow(() -> new RuntimeException("Grupo no encontrado."));
        if ("INACTIVO".equalsIgnoreCase(group.getStatus())) {
            throw new IllegalStateException("ACCION DENEGADA: El grupo está Inactivo y se encuentra en modo de solo lectura.");
        }
    }

}
