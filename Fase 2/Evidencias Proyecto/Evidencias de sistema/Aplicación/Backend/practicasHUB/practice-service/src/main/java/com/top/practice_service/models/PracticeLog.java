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
    private String activitiesDescription;

    @Column(name = "status", length = 30)
    private String status = "REGISTRADA";

    @Column(name = "request_status", length = 30)
    private String requestStatus = "SIN_SOLICITUD";

    @Column(name = "correction_reason", columnDefinition = "TEXT")
    private String correctionReason;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.status = "REGISTRADA";
    }
}
