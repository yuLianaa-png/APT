package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

//lo que ve el supervisor al abrir su enlace
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class SupervisorViewDTO {
    private String studentName;
    private String groupName;
    private String company;
    private String supervisorName;
    private LocalDateTime expiresAt;
    private boolean readOnly;
    private Integer minimumHours;
    private double registeredHours;
    private double validatedHours;
    private List<SupervisorLogDTO> logs;
}
