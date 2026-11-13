package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class StudentDashboardDTO {
    private Long enrollmentId;
    private double totalRegisteredHours;
    private int requiredHours;
    private double progressPercentage;
}
