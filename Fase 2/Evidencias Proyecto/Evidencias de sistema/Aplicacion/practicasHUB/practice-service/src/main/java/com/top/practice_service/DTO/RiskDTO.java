package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class RiskDTO {
    //SIN_ALERTA, ATENCION o RIESGO
    private String level;
    private List<String> reasons;
    //lo que ve el estudiante: sin las alertas que dependen del docente (solicitudes sin responder)
    private String studentLevel;
    private List<String> studentReasons;
    //horas por semana que necesita para llegar a la meta antes de la fecha de termino (null si no aplica)
    private Double requiredWeeklyHours;
    //fecha de termino que se usa: la individual si el docente dio una prorroga, si no la del grupo
    private LocalDate endDate;
}
