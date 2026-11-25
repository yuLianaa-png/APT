package com.top.document_service.DTO;

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
    private boolean countsForFinal;
    private List<TemplateItemDTO> items = new ArrayList<>();
}
