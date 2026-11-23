package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "practice_logs")
public class PracticeLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long logId;

    private Long idEnrollment;

    private LocalDate logDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer breakMinutes;

    private Double totalHours;
    @Column(name = "main_activity", length = 200)
    private String mainActivity;
    private String activitiesDescription;

    @Column(name = "request_status", length = 30)
    private String requestStatus = "Sin solicitud";

    @Column(name = "status", length = 30)
    private String status = "REGISTRADA";

    @Column(name = "correction_reason", columnDefinition = "TEXT")
    private String correctionReason;

    //cuando el estudiante pidio la correccion: permite saber cuantos dias lleva esperando
    @Column(name = "correction_requested_at")
    private LocalDateTime correctionRequestedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "teacher_observation", columnDefinition = "TEXT")
    private String teacherObservation;

    //validacion del supervisor del centro de practica (respaldo: las horas cuentan igual)
    //PENDIENTE, VALIDADA u OBSERVADA; null en jornadas antiguas = PENDIENTE
    @Column(name = "supervisor_status", length = 20)
    private String supervisorStatus = "PENDIENTE";
    @Column(name = "supervisor_comment", columnDefinition = "TEXT")
    private String supervisorComment;
    @Column(name = "supervisor_reviewed_at")
    private LocalDateTime supervisorReviewedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.status = "REGISTRADA";
    }
}
