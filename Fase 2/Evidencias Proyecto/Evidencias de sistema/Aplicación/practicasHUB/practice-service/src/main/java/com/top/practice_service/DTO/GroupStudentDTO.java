package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class GroupStudentDTO {
    private Long enrollmentId;
    private Long studentId;
    private LocalDateTime enrollmentDate;
    private int totalLogs;
    private double registeredHours;
    private int pendingRequests;
    private int enabledCorrections;
}
