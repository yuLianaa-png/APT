package com.top.practice_service.services;

import com.top.practice_service.DTO.StudentDashboardDTO;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeLog;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import com.top.practice_service.repositories.PracticeLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

@Service
public class PracticeLogService {
    @Autowired
    private PracticeLogRepository logRepository;

    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;

    @Autowired
    private PracticeGroupRepository groupRepository;

    public PracticeLog registerHours(Long enrollmentId, PracticeLog request, Long studentId){
        PracticeEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("La inscripción no existe."));

        if (!enrollment.getStudentId().equals(studentId)) {
            throw new RuntimeException("ACCESO DENEGADO: Esta inscripción no te pertenece.");
        }

        if (!"APROBADO".equalsIgnoreCase(enrollment.getStatus())) {
            throw new RuntimeException("Solo puedes registrar horas en prácticas con estado APROBADO.");
        }

        if (request.getEndTime().isBefore(request.getStartTime())) {
            throw new RuntimeException("La hora de término no puede ser anterior a la hora de inicio.");
        }

        Duration duration = Duration.between(request.getStartTime(), request.getEndTime());
        long totalMinutes = duration.toMinutes();

        int breakMins = request.getBreakMinutes() != null ? request.getBreakMinutes() : 0;
        if (breakMins > totalMinutes) {
            throw new RuntimeException("Los minutos de descanso no pueden superar el tiempo total trabajado.");
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
        newLog.setStatus("PENDIENTE");

        return logRepository.save(newLog);
    }

    public List<PracticeLog> getPendingLogs(Long enrollmentId, Long professorId) {
        PracticeEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("La inscripción no existe."));

        groupRepository.findById(enrollment.getPracticeGroupId()).ifPresent(group -> {
            if (!group.getIdProfessor().equals(professorId)) {
                throw new RuntimeException("ACCESO DENEGADO: No eres el profesor de este grupo.");
            }
        });

        return logRepository.findByIdEnrollmentAndStatus(enrollmentId, "PENDIENTE");
    }

    public PracticeLog updateLogStatus(Long logId, String newStatus, Long professorId) {
        PracticeLog log = logRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Registro no encontrado."));

        PracticeEnrollment enrollment = enrollmentRepository.findById(log.getIdEnrollment())
                .orElseThrow(() -> new RuntimeException("Inscripción no encontrada."));

        groupRepository.findById(enrollment.getPracticeGroupId()).ifPresent(group -> {
            if (!group.getIdProfessor().equals(professorId)) {
                throw new RuntimeException("ACCESO DENEGADO: No puedes evaluar horas de otros grupos.");
            }
        });

        log.setStatus(newStatus.toUpperCase());
        return logRepository.save(log);
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

        double approved = allLogs.stream()
                .filter(log -> "APROBADA".equalsIgnoreCase(log.getStatus()))
                .mapToDouble(PracticeLog::getTotalHours)
                .sum();

        double pending = allLogs.stream()
                .filter(log -> "PENDIENTE".equalsIgnoreCase(log.getStatus()))
                .mapToDouble(PracticeLog::getTotalHours)
                .sum();

        double rejected = allLogs.stream()
                .filter(log -> "RECHAZADA".equalsIgnoreCase(log.getStatus()))
                .mapToDouble(PracticeLog::getTotalHours)
                .sum();

        double percentage = 0.0;
        if (requiredHours > 0) {
            percentage = Math.round((approved / requiredHours) * 10000.0) / 100.0;
        }

        return new StudentDashboardDTO(enrollmentId, approved, pending, rejected, requiredHours, percentage);
    }

    public PracticeLog requestCorrection(Long logId, String reason){
        PracticeLog log = logRepository.findById(logId).orElseThrow(() -> new RuntimeException("Jornada no encontrada"));

        if(!"REGISTRADA".equalsIgnoreCase(log.getStatus())){
            throw new RuntimeException("Solo se puede solicitar correción de jornadas REGISTRADAS ");
        }

        log.setRequestStatus("ENVIADA");
        log.setCorrectionReason(reason);
        return logRepository.save(log);
    }

    public PracticeLog authorizeCorrection(Long logId){
        PracticeLog log = logRepository.findById(logId).orElseThrow(() -> new RuntimeException("Jornada no encontrada"));

        log.setStatus("OBSERVADA");
        log.setRequestStatus("HABILITADA");
        return logRepository.save(log);
    }

    public PracticeLog updateObservedLog(Long logId, PracticeLog updateData){
        PracticeLog log = logRepository.findById(logId).orElseThrow(() -> new RuntimeException("Jornada no encontrada"));

        if(!"OBSERVADA".equalsIgnoreCase(log.getStatus())){
            throw new RuntimeException("Solo puedes modificar jornadas que han sido OBSERVADAS por el profesor");
        }

        log.setLogDate(updateData.getLogDate());
        log.setStartTime(updateData.getStartTime());
        log.setEndTime(updateData.getEndTime());
        log.setActivitiesDescription(updateData.getActivitiesDescription());
        log.setStatus("CORREGIDA");
        log.setRequestStatus("ENTREGADA");
        return logRepository.save(log);
    }

    public PracticeLog approveCorrection(Long logId){
        PracticeLog log = logRepository.findById(logId).orElseThrow(() -> new RuntimeException("Jornada no encontrada"));

        log.setStatus("REGISTRADA");
        log.setRequestStatus("SIN_SOLICITUD");
        log.setCorrectionReason(null);
        return logRepository.save(log);
    }
}
