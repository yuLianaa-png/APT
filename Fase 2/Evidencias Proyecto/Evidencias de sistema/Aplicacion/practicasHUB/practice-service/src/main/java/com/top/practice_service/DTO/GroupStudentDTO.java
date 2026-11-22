package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class GroupStudentDTO {
    private Long enrollmentId;
    private Long studentId;
    private String studentName;
    private String studentEmail;
    private LocalDateTime enrollmentDate;
    private int totalLogs;
    private double registeredHours;
    private int pendingRequests;
    private int enabledCorrections;
    private LocalDate lastLogDate;
    private String riskLevel;
    private List<String> riskReasons;
    private Double requiredWeeklyHours;
    private String followUpStatus;
    private LocalDate customEndDate;
    private Double weeklyHoursCommitment;
    private long unreadMessages;
}
