package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class TemplateSectionDTO {
    private String title;
    private Boolean countsForFinal;
    private List<TemplateItemDTO> items = new ArrayList<>();
}
