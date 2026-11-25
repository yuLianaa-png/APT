package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

//una evaluacion de un estudiante (o un hito que todavia no se envia: evaluationId null, status SIN_ENVIAR)
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class SupervisorEvaluationDTO {
    private Long evaluationId;
    private String milestone;
    private String label;
    private String status;
    private Double requiredHours;
    private Boolean reached;
    private LocalDateTime sentAt;
    private Integer reminderCount;
    private String supervisorName;
    private LocalDateTime submittedAt;
    private Double finalGrade;
    private List<Double> sectionGrades;
    private Boolean publishedToStudent;
    private LocalDateTime publishedAt;
    private EvaluationTemplateDTO template;
    private EvaluationAnswersDTO answers;
}
