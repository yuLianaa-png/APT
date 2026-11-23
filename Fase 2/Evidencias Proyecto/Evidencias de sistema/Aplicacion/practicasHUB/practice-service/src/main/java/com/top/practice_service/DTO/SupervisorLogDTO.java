package com.top.practice_service.DTO;

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
public class SupervisorLogDTO {
    private Long logId;
    private LocalDate logDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer breakMinutes;
    private Double totalHours;
    private String mainActivity;
    private String activitiesDescription;
    private String supervisorStatus;
    private String supervisorComment;
    private LocalDateTime supervisorReviewedAt;
}
