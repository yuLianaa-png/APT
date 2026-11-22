package com.top.practice_service.DTO;

import com.top.practice_service.models.RiskFollowUpAction;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

//seguimiento de la alerta de un estudiante, tal como lo ve el docente
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class FollowUpDTO {
    private Long enrollmentId;
    //null si el estudiante nunca tuvo una alerta
    private String status;
    private String level;
    private LocalDateTime openedAt;
    private LocalDateTime resolvedAt;
    //alerta actual del estudiante
    private String riskLevel;
    private List<String> riskReasons;
    private Double requiredWeeklyHours;
    private LocalDate endDate;
    //plan vigente
    private LocalDate customEndDate;
    private Double weeklyHoursCommitment;
    private LocalDate commitmentSince;
    //historial completo, lo mas reciente primero
    private List<RiskFollowUpAction> actions;
}
