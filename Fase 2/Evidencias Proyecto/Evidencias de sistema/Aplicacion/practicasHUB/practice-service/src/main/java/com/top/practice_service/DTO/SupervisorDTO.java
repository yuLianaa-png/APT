package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

//datos del supervisor de una vinculacion y el resumen de su validacion
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class SupervisorDTO {
    private Long enrollmentId;
    private String name;
    private String position;
    private String email;
    private String company;
    private LocalDateTime lastEmailAt;
    private long pendingLogs;
    private long validatedLogs;
    private long observedLogs;
    private double validatedHours;
    private double registeredHours;
}
