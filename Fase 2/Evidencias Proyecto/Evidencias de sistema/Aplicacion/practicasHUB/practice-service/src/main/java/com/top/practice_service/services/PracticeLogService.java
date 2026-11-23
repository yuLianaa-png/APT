package com.top.practice_service.services;

import com.top.practice_service.DTO.StudentDashboardDTO;
import com.top.practice_service.clients.AuthClient;
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
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
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

    @Autowired
    private AuthClient authClient;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    //nombre del estudiante para los mensajes - si auth-service no responde se usa un generico
    private String studentName(Long studentId) {
        try {
            String name = authClient.getUserById(studentId).getName();
            return name != null && !name.isBlank() ? name : "Un estudiante";
        } catch (Exception e) {
            return "Un estudiante";
        }
    }

    //avisa al docente del grupo al que pertenece la inscripcion
    private void notifyProfessor(PracticeEnrollment enrollment, String type, String title, String message, Long referenceId) {
        try {
            PracticeGroup group = groupRepository.findById(enrollment.getPracticeGroupId()).get();
            notificationClient.sendNotification(
                    group.getIdProfessor(), group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                    type, title, message, "/jornadas", referenceId
            );
        } catch (Exception e) {
            System.err.println("Error notificando al docente: " + e.getMessage());
        }
    }

    public PracticeLog registerHours(Long enrollmentId, PracticeLog request, Long studentId) {
        PracticeEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("La inscripción no existe."));

        if (!enrollment.getStudentId().equals(studentId)) {
            throw new RuntimeException("ACCESO DENEGADO: Esta inscripción no te pertenece.");
        }
        validateGroupIsActive(enrollmentId);

        if (request.getLogDate() == null) {
            throw new RuntimeException("La fecha de la jornada es obligatoria.");
        }

        //solo se registran jornadas ya realizadas: hoy o dias anteriores (hora de Chile)
        if (request.getLogDate().isAfter(LocalDate.now(ZoneId.of("America/Santiago")))) {
            throw new RuntimeException("La fecha de la jornada no puede ser posterior a hoy.");
        }

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
        newLog.setMainActivity(request.getMainActivity());
        newLog.setActivitiesDescription(request.getActivitiesDescription());

        PracticeLog savedLog = logRepository.save(newLog);

        notifyProfessor(enrollment, "LOG_CREATED", "Nueva jornada registrada",
                studentName(studentId) + " registró la jornada del " + savedLog.getLogDate().format(DATE_FORMAT)
                        + " (" + savedLog.getTotalHours() + " h).", savedLog.getLogId());

        return savedLog;
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
                .mapToDouble(log -> log.getTotalHours() != null ? log.getTotalHours() : 0.0)
                .sum();
        totalRegisteredHours = Math.round(totalRegisteredHours * 100.0) / 100.0;

        double percentage = 0.0;
        if (requiredHours > 0) {
            percentage = Math.round((totalRegisteredHours / requiredHours) * 10000.0) / 100.0;
        }

        double remainingHours = (requiredHours > totalRegisteredHours) ? (requiredHours - totalRegisteredHours) : 0.0;
        boolean goalReached = totalRegisteredHours >= requiredHours;


        int totalLogs = allLogs.size();
        int pendingRequests = (int) allLogs.stream().filter(log -> "Pendiente".equalsIgnoreCase(log.getRequestStatus())).count();
        int enabledCorrections = (int) allLogs.stream().filter(log -> "OBSERVADA".equalsIgnoreCase(log.getStatus())).count();
        int pendingDeliveries = 0;


        return new StudentDashboardDTO(
                enrollmentId,
                totalRegisteredHours,
                requiredHours,
                percentage,
                remainingHours,
                totalLogs,
                goalReached,
                pendingRequests,
                enabledCorrections,
                pendingDeliveries
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
        log.setMainActivity(updatedData.getMainActivity());
        log.setActivitiesDescription(updatedData.getActivitiesDescription());
        //si la jornada cambia, el supervisor tiene que volver a revisarla
        log.setSupervisorStatus("PENDIENTE");
        log.setSupervisorComment(null);
        log.setSupervisorReviewedAt(null);

        if (isTeacherEnabled) {
            log.setCorrectionReason(null);
            log.setTeacherObservation(null);
            log.setStatus("REGISTRADA");
            log.setRequestStatus("Completada");
        }

        PracticeLog savedLog = logRepository.save(log);

        PracticeEnrollment enrollment = enrollmentRepository.findById(log.getIdEnrollment()).orElse(null);
        if (enrollment != null) {
            String name = studentName(enrollment.getStudentId());
            String date = savedLog.getLogDate().format(DATE_FORMAT);
            if (isTeacherEnabled) {
                notifyProfessor(enrollment, "CORRECTION_SAVED", "Corrección guardada",
                        name + " guardó la corrección de la jornada del " + date + ".", savedLog.getLogId());
            } else {
                notifyProfessor(enrollment, "LOG_UPDATED", "Jornada editada",
                        name + " editó la jornada del " + date + " dentro del plazo de 24 horas.", savedLog.getLogId());
            }
        }

        return savedLog;
    }

    public PracticeLog requestCorrection(Long logId, String reason) {
        PracticeLog log = logRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Jornada no encontrada"));

        validateGroupIsActive(log.getIdEnrollment());

        if (reason == null || reason.trim().isEmpty()) throw new IllegalArgumentException("Motivo obligatorio.");
        if ("Pendiente".equalsIgnoreCase(log.getRequestStatus())) {
            throw new IllegalStateException("Ya hay una solicitud de corrección esperando respuesta del docente.");
        }

        log.setCorrectionReason(reason);
        log.setRequestStatus("Pendiente");
        log.setCorrectionRequestedAt(LocalDateTime.now());

        PracticeLog savedLog = logRepository.save(log);

        enrollmentRepository.findById(log.getIdEnrollment()).ifPresent(enrollment ->
                notifyProfessor(enrollment, "CORRECTION_REQUEST", "Nueva solicitud de corrección",
                        studentName(enrollment.getStudentId()) + " solicitó corregir la jornada del "
                                + savedLog.getLogDate().format(DATE_FORMAT) + ". Motivo: " + reason, savedLog.getLogId()));

        return savedLog;
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
                    "CORRECTION_ENABLED", "Corrección habilitada",
                    "El docente ha respondido a tu solicitud. Observación: " + observation, "/jornadas", log.getLogId()
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
                    "CORRECTION_REJECTED", "Solicitud rechazada",
                    "El docente ha respondido a tu solicitud. Observación: " + comment, "/jornadas", log.getLogId()
            );
        } catch (Exception e) { System.err.println("Error notificando al estudiante: " + e.getMessage()); }

        return logRepository.save(log);
    }

    //estudiante o docente - historial de jornadas de una inscripcion
    public List<PracticeLog> getLogsByEnrollment(Long enrollmentId, Long userId, String role) {
        checkEnrollmentAccess(enrollmentId, userId, role);
        List<PracticeLog> logs = logRepository.findByIdEnrollment(enrollmentId);
        logs.sort((a, b) -> b.getLogDate().compareTo(a.getLogDate()));
        return logs;
    }

    public PracticeLog getLogById(Long logId, Long userId, String role) {
        PracticeLog log = logRepository.findById(logId)
                .orElseThrow(() -> new IllegalArgumentException("Jornada no encontrada"));
        checkEnrollmentAccess(log.getIdEnrollment(), userId, role);
        return log;
    }

    //consultas internas para document-service
    public Long getEnrollmentIdByLog(Long logId) {
        return logRepository.findById(logId)
                .orElseThrow(() -> new IllegalArgumentException("Jornada no encontrada"))
                .getIdEnrollment();
    }

    public List<Long> getLogIdsByEnrollment(Long enrollmentId) {
        return logRepository.findByIdEnrollment(enrollmentId).stream()
                .map(PracticeLog::getLogId)
                .toList();
    }

    //el estudiante solo accede a sus inscripciones y el docente solo a las de sus grupos
    public void checkLogAccess(Long logId, Long userId, String role) {
        PracticeLog log = logRepository.findById(logId)
                .orElseThrow(() -> new IllegalArgumentException("Jornada no encontrada"));
        checkEnrollmentAccess(log.getIdEnrollment(), userId, role);
    }

    private void checkEnrollmentAccess(Long enrollmentId, Long userId, String role) {
        PracticeEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new IllegalArgumentException("La inscripción no existe."));

        if ("ESTUDIANTE".equalsIgnoreCase(role)) {
            if (!enrollment.getStudentId().equals(userId)) {
                throw new SecurityException("ACCESO DENEGADO: Esta inscripción no te pertenece.");
            }
            return;
        }

        if ("PROFESOR".equalsIgnoreCase(role)) {
            PracticeGroup group = groupRepository.findById(enrollment.getPracticeGroupId())
                    .orElseThrow(() -> new IllegalArgumentException("Grupo no encontrado."));
            if (!group.getIdProfessor().equals(userId)) {
                throw new SecurityException("ACCESO DENEGADO: No eres el profesor de este grupo.");
            }
            return;
        }

        throw new SecurityException("ACCESO DENEGADO.");
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
