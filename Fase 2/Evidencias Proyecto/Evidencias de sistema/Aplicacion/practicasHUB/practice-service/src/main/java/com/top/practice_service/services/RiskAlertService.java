package com.top.practice_service.services;

import com.top.practice_service.DTO.RiskDTO;
import com.top.practice_service.clients.NotificationClient;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.models.RiskFollowUp;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import com.top.practice_service.repositories.PracticeLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

//Aviso diario en dos pasos: primero avisa estudiante, luego profesor cuando este en riego
@Service
public class RiskAlertService {
    //un mismo recordatorio no se repite antes de estos dias, salvo que el nivel cambie
    private static final int REMINDER_EVERY_DAYS = 3;
    private static final ZoneId CHILE = ZoneId.of("America/Santiago");

    @Autowired
    private PracticeGroupRepository groupRepository;
    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;
    @Autowired
    private PracticeLogRepository logRepository;
    @Autowired
    private PracticeRiskService riskService;
    @Autowired
    private RiskFollowUpService followUpService;
    @Autowired
    private NotificationClient notificationClient;

    //lunes a viernes a las 09:00, hora de Chile
    @Scheduled(cron = "0 0 9 * * MON-FRI", zone = "America/Santiago")
    public void sendDailyRiskAlerts() {
        LocalDate today = LocalDate.now(CHILE);

        for (PracticeGroup group : groupRepository.findAll()) {
            if (!"Activo".equalsIgnoreCase(group.getStatus())) continue;

            int atRisk = 0;
            int unattended = 0;
            for (PracticeEnrollment enrollment : enrollmentRepository.findByPracticeGroupId(group.getIdGroup())) {
                RiskDTO risk = riskService.evaluate(group, enrollment,
                        logRepository.findByIdEnrollment(enrollment.getEnrollmentId()));
                RiskFollowUp followUp = followUpService.sync(enrollment, risk);

                remindStudent(group, enrollment, risk, today);

                if (PracticeRiskService.RISK.equals(risk.getLevel())) atRisk++;
                if (followUp != null && RiskFollowUpService.OPEN.equals(followUp.getStatus())) unattended++;
            }

            if (atRisk == 0 && unattended == 0) continue;
            try {
                String message = (atRisk > 0
                        ? atRisk + (atRisk == 1 ? " estudiante está" : " estudiantes están") + " en riesgo. "
                        : "")
                        + (unattended > 0
                        ? unattended + (unattended == 1 ? " alerta sigue" : " alertas siguen") + " sin gestionar. "
                        : "")
                        + "Revisa el detalle en Estudiantes.";
                notificationClient.sendNotification(
                        group.getIdProfessor(), group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                        "RISK_ALERTS", "Estudiantes que requieren tu intervención", message,
                        "/estudiantes", group.getIdGroup()
                );
            } catch (Exception e) {
                System.err.println("Error enviando el aviso diario de riesgo: " + e.getMessage());
            }
        }
    }

    //recordatorio al estudiante con lo que necesita para ponerse al dia
    private void remindStudent(PracticeGroup group, PracticeEnrollment enrollment, RiskDTO risk, LocalDate today) {
        String level = risk.getStudentLevel();
        if (PracticeRiskService.NO_ALERT.equals(level)) {
            if (enrollment.getLastReminderLevel() != null) {
                enrollment.setLastReminderLevel(null);
                enrollmentRepository.save(enrollment);
            }
            return;
        }

        boolean sameLevel = level.equals(enrollment.getLastReminderLevel());
        LocalDate last = enrollment.getLastReminderDate();
        if (sameLevel && last != null && ChronoUnit.DAYS.between(last, today) < REMINDER_EVERY_DAYS) return;

        StringBuilder message = new StringBuilder(String.join(" ", risk.getStudentReasons()));
        if (risk.getRequiredWeeklyHours() != null && risk.getRequiredWeeklyHours() > 0) {
            message.append(" Para alcanzar la meta a tiempo necesitas unas ")
                    .append(risk.getRequiredWeeklyHours()).append(" h por semana.");
        }
        try {
            notificationClient.sendNotification(
                    enrollment.getStudentId(), group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                    "RISK_REMINDER",
                    PracticeRiskService.RISK.equals(level) ? "Tu práctica está en riesgo" : "Tu práctica necesita atención",
                    message.toString().trim(), "/resumen", group.getIdGroup());
            enrollment.setLastReminderLevel(level);
            enrollment.setLastReminderDate(today);
            enrollmentRepository.save(enrollment);
        } catch (Exception e) {
            System.err.println("Error enviando el recordatorio al estudiante: " + e.getMessage());
        }
    }
}
