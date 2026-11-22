package com.top.practice_service.services;

import com.top.practice_service.DTO.RiskDTO;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.models.PracticeLog;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Service
public class PracticeRiskService {
    public static final String NO_ALERT = "SIN_ALERTA";
    public static final String WARNING = "ATENCION";
    public static final String RISK = "RIESGO";

    //umbrales de las reglas
    private static final int INACTIVITY_WARNING_DAYS = 4;
    private static final int INACTIVITY_RISK_DAYS = 7;
    private static final int MIN_DAYS_TO_EVALUATE_PACE = 7;
    private static final double PACE_RISK_RATIO = 0.8;
    private static final int PENDING_REQUEST_WARNING_DAYS = 2;
    private static final int PLAN_REVIEW_DAYS = 7; //el plan acordado se revisa recien cuando lleva una semana completa

    //zona horaria de chile
    private static final ZoneId CHILE = ZoneId.of("America/Santiago");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public RiskDTO evaluate(PracticeGroup group, PracticeEnrollment enrollment, List<PracticeLog> logs) {
        LocalDate today = LocalDate.now(CHILE);
        List<String> reasons = new ArrayList<>();
        String level = NO_ALERT;

        double hours = logs.stream()
                .mapToDouble(log -> log.getTotalHours() != null ? log.getTotalHours() : 0.0)
                .sum();
        int goal = group.getMinimumHours() != null ? group.getMinimumHours() : 0;
        boolean goalReached = goal > 0 && hours >= goal;
        boolean groupActive = "Activo".equalsIgnoreCase(group.getStatus());
        //si el docente dio una prorroga individual, manda esa fecha
        LocalDate endDate = enrollment.getCustomEndDate() != null ? enrollment.getCustomEndDate() : group.getEndDate();
        Double requiredWeeklyHours = null;

        //inactividad, ritmo y plan - solo si el grupo esta activo y el estudiante aun no llega a la meta
        if (groupActive && !goalReached) {
            LocalDate lastLogDate = lastLogDate(logs);
            LocalDate enrollmentDay = enrollment.getEnrollmentDate() != null
                    ? enrollment.getEnrollmentDate().toLocalDate() : today;
            LocalDate lastActivity = lastLogDate != null ? lastLogDate : enrollmentDay;
            long inactiveDays = ChronoUnit.DAYS.between(lastActivity, today);

            if (inactiveDays >= INACTIVITY_WARNING_DAYS) {
                level = raise(level, inactiveDays >= INACTIVITY_RISK_DAYS ? RISK : WARNING);
                reasons.add(lastLogDate != null
                        ? "Lleva " + inactiveDays + " días sin registrar jornadas."
                        : "Se vinculó hace " + inactiveDays + " días y aún no registra jornadas.");
            }

            if (endDate != null && goal > 0) {
                if (today.isAfter(endDate)) {
                    level = raise(level, RISK);
                    reasons.add("El periodo terminó el " + endDate.format(DATE_FORMAT)
                            + " sin alcanzar la meta (" + round(hours) + " de " + goal + " h).");
                } else {
                    //horas por semana que le faltan para llegar a la meta a tiempo (incluye el dia de hoy)
                    long daysLeft = ChronoUnit.DAYS.between(today, endDate) + 1;
                    requiredWeeklyHours = round((goal - hours) / (daysLeft / 7.0));

                    long elapsedDays = ChronoUnit.DAYS.between(enrollmentDay, today);
                    //la primera semana no se evalua el ritmo, para no dar falsas alarmas
                    if (elapsedDays >= MIN_DAYS_TO_EVALUATE_PACE) {
                        double hoursPerDay = hours / elapsedDays;
                        long remainingDays = ChronoUnit.DAYS.between(today, endDate);
                        double projected = hours + hoursPerDay * remainingDays;

                        if (projected < goal) {
                            level = raise(level, projected < goal * PACE_RISK_RATIO ? RISK : WARNING);
                            reasons.add("Al ritmo actual llegaría a unas " + Math.round(projected) + " de "
                                    + goal + " h al " + endDate.format(DATE_FORMAT) + ".");
                        }
                    }
                }
            }

            //plan acordado con el docente - horas de los ultimos 7 dias contra las comprometidas
            Double commitment = enrollment.getWeeklyHoursCommitment();
            LocalDate since = enrollment.getCommitmentSince();
            if (commitment != null && commitment > 0 && since != null
                    && ChronoUnit.DAYS.between(since, today) >= PLAN_REVIEW_DAYS) {
                LocalDate weekStart = today.minusDays(6);
                double lastWeekHours = logs.stream()
                        .filter(log -> log.getLogDate() != null && !log.getLogDate().isBefore(weekStart))
                        .mapToDouble(log -> log.getTotalHours() != null ? log.getTotalHours() : 0.0)
                        .sum();
                if (lastWeekHours < commitment) {
                    level = raise(level, WARNING);
                    reasons.add("No está cumpliendo el plan acordado: " + round(lastWeekHours) + " de "
                            + round(commitment) + " h en los últimos 7 días.");
                }
            }
        }

        //hasta aqui son alertas que el estudiante puede corregir por su cuenta
        String studentLevel = level;
        List<String> studentReasons = new ArrayList<>(reasons);

        //solicitudes de correccion que esperan respuesta del docente
        LocalDate serverToday = LocalDateTime.now().toLocalDate();
        long oldestPendingDays = logs.stream()
                .filter(log -> "Pendiente".equalsIgnoreCase(log.getRequestStatus()))
                .map(PracticeLog::getCorrectionRequestedAt)
                .filter(Objects::nonNull)
                .mapToLong(requestedAt -> ChronoUnit.DAYS.between(requestedAt.toLocalDate(), serverToday))
                .max()
                .orElse(0);
        if (oldestPendingDays > PENDING_REQUEST_WARNING_DAYS) {
            level = raise(level, WARNING);
            reasons.add("Tiene una solicitud de corrección sin responder hace " + oldestPendingDays + " días.");
        }

        return new RiskDTO(level, reasons, studentLevel, studentReasons, requiredWeeklyHours, endDate);
    }

    public LocalDate lastLogDate(List<PracticeLog> logs) {
        return logs.stream()
                .map(PracticeLog::getLogDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(null);
    }

    //se queda con el nivel mas grave
    private String raise(String current, String candidate) {
        return weight(candidate) > weight(current) ? candidate : current;
    }

    private int weight(String level) {
        if (RISK.equals(level)) return 2;
        if (WARNING.equals(level)) return 1;
        return 0;
    }

    private double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
