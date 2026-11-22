package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class StudentEnrollmentDTO {
    private Long enrollmentId;
    private Long practiceGroupId;
    private String status;
    private LocalDateTime enrollmentDate;
    private String groupCode;
    private String courseName;
    private String description;
    private String period;
    private Long idProfessor;
    private double registeredHours;
    private int requiredHours;
    private int totalLogs;
    private int pendingRequests;
    private LocalDateTime groupCreationDate;
    private String professorName;
    //lo que el estudiante necesita para ponerse al dia (sin las alertas que dependen del docente)
    private String riskLevel;
    private List<String> riskReasons;
    private Double requiredWeeklyHours;
    private LocalDate endDate;
    private Double weeklyHoursCommitment;
    //mensajes del docente que el estudiante aun no lee
    private long unreadMessages;
}
