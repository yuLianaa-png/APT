package com.top.practice_service.services;

import com.top.practice_service.DTO.RiskDTO;
import com.top.practice_service.clients.NotificationClient;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import com.top.practice_service.repositories.PracticeLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

//Aviso diario al docente: cuantos estudiantes de cada grupo requieren atencion.
@Service
public class RiskAlertService {
    @Autowired
    private PracticeGroupRepository groupRepository;
    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;
    @Autowired
    private PracticeLogRepository logRepository;
    @Autowired
    private PracticeRiskService riskService;
    @Autowired
    private NotificationClient notificationClient;

    //lunes a viernes a las 09:00, hora de Chile
    @Scheduled(cron = "0 0 9 * * MON-FRI", zone = "America/Santiago")
    public void sendDailyRiskAlerts() {
        for (PracticeGroup group : groupRepository.findAll()) {
            if (!"Activo".equalsIgnoreCase(group.getStatus())) continue;

            int atRisk = 0;
            int needAttention = 0;
            for (PracticeEnrollment enrollment : enrollmentRepository.findByPracticeGroupId(group.getIdGroup())) {
                RiskDTO risk = riskService.evaluate(group, enrollment,
                        logRepository.findByIdEnrollment(enrollment.getEnrollmentId()));
                if (PracticeRiskService.RISK.equals(risk.getLevel())) atRisk++;
                else if (PracticeRiskService.WARNING.equals(risk.getLevel())) needAttention++;
            }

            int total = atRisk + needAttention;
            if (total == 0) continue;

            try {
                notificationClient.sendNotification(
                        group.getIdProfessor(), group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                        "RISK_ALERTS", "Estudiantes que requieren atención",
                        total + (total == 1 ? " estudiante requiere" : " estudiantes requieren") + " atención"
                                + (atRisk > 0 ? " (" + atRisk + " en riesgo)" : "") + ". Revisa el detalle en Estudiantes.",
                        "/estudiantes", group.getIdGroup()
                );
            } catch (Exception e) {
                System.err.println("Error enviando el aviso diario de riesgo: " + e.getMessage());
            }
        }
    }
}
