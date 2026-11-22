package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

//lo que hizo el docente con una alerta: contacto, acuerdo, plan, nota o cierre
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "risk_follow_up_actions")
public class RiskFollowUpAction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "action_id")
    private Long actionId;

    @Column(name = "follow_up_id", nullable = false)
    private Long followUpId;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "professor_id")
    private Long professorId;

    @Column(length = 20)
    private String type;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "commitment_date")
    private LocalDate commitmentDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
