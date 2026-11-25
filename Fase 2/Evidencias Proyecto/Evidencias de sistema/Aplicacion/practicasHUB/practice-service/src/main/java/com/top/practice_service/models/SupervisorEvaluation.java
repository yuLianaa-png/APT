package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

//Evaluacion del supervisor a un estudiante en un momento
@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "supervisor_evaluations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"enrollment_id", "milestone"}))
public class SupervisorEvaluation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long evaluationId;

    @Column(name = "enrollment_id")
    private Long enrollmentId;
    private Long groupId;
    @Column(length = 20)
    private String milestone;
    @Column(length = 20)
    private String status;

    private Long templateId;

    private LocalDateTime createdAt;
    private LocalDateTime sentAt;
    private LocalDateTime lastReminderAt;
    private int reminderCount;

    @Column(length = 120)
    private String supervisorName;
    @Column(length = 150)
    private String supervisorEmail;
    private LocalDateTime submittedAt;
    private Double finalGrade;

    private boolean publishedToStudent;
    private LocalDateTime publishedAt;
}
