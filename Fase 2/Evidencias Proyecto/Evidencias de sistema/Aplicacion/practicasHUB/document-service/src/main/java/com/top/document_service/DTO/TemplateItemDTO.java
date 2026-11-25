package com.top.document_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

//criterio de la pauta.
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class TemplateItemDTO {
    private String type;
    private String label;
    private boolean allowNotApplicable;
    private Double weight;
    private Integer sourceSection;
    private Integer minActivities;
}
