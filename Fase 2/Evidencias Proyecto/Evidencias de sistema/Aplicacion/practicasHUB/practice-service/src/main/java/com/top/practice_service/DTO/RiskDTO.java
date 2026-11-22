package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class RiskDTO {
    private String level;
    private List<String> reasons;
    private String studentLevel;
    private List<String> studentReasons;
    private Double requiredWeeklyHours;
    private LocalDate endDate;
}
