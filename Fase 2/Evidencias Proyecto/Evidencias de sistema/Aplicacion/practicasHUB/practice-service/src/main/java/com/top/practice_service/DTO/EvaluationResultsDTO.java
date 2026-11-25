package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

//resumen de un hito en el grupo, para publicar los resultados de todos de una vez
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class EvaluationResultsDTO {
    private String milestone;
    private String label;
    private long waitingTemplate;
    private long sent;
    private long answered;
    private long published;
}
