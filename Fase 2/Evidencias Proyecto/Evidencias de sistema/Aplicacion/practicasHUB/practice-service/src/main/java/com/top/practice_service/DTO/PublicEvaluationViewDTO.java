package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

//lo que ve el supervisor al abrir el enlace de evaluacion
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class PublicEvaluationViewDTO {
    private String studentName;
    private String groupName;
    private String company;
    private String supervisorName;
    private String label;
    private LocalDateTime expiresAt;
    private Boolean submitted;
    private LocalDateTime submittedAt;
    private Boolean readOnly;
    private EvaluationTemplateDTO template;
}
