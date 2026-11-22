package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "practice_enrollments")
public class PracticeEnrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long enrollmentId;

    private Long practiceGroupId;
    private Long studentId;
    private String status;
    private LocalDateTime enrollmentDate;

    //plan de seguimiento que define el docente: prorroga individual y horas semanales comprometidas
    @Column(name = "custom_end_date")
    private LocalDate customEndDate;
    @Column(name = "weekly_hours_commitment")
    private Double weeklyHoursCommitment;
    @Column(name = "commitment_since")
    private LocalDate commitmentSince;

    //ultimo recordatorio de riesgo enviado al estudiante, para no repetirlo todos los dias
    @Column(name = "last_reminder_level", length = 20)
    private String lastReminderLevel;
    @Column(name = "last_reminder_date")
    private LocalDate lastReminderDate;
}
