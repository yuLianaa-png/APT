package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

//una evaluacion del grupo (intermedia, final o ambas) con su pauta publicada y su borrador
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class EvaluationSlotDTO {
    private String slot;
    private String label;
    private EvaluationTemplateDTO published;
    private EvaluationTemplateDTO draft;
}
