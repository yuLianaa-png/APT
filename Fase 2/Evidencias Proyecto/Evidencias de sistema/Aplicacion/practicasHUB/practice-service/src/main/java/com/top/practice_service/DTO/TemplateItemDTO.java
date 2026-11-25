package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class TemplateItemDTO {
    private String type;
    private String label;
    private Boolean allowNotApplicable;
    private Double weight;
    private Integer sourceSection;
    private Integer minActivities;
}
