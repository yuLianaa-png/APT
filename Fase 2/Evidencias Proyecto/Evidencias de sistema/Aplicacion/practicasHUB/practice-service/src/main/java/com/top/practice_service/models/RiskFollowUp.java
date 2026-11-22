package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

//seguimiento de una alerta de un estudiante: ABIERTA (sin gestionar), EN_SEGUIMIENTO o RESUELTA
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "risk_follow_ups")
public class RiskFollowUp {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "follow_up_id")
    private Long followUpId;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(length = 20)
    private String status;

    //nivel mas grave que tuvo la alerta mientras estuvo abierta
    @Column(length = 20)
    private String level;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
