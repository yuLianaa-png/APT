package com.top.practice_service.services;

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
            throw new RuntimeException("Acceso denegado: Esta inscripción no te pertenece.");
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
}
