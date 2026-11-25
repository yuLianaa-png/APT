package com.top.document_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

//borrador de pauta leido desde una plantilla - el docente lo revisa antes de publicarlo.
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class ParsedTemplateDTO {
    private String instructions;
    private List<TemplateSectionDTO> sections = new ArrayList<>();
    private List<String> warnings = new ArrayList<>();
    //escala de la plantilla original: 7, 10 o 0 (conceptos como Excelente/Bueno)
    private Integer detectedScale;
    private String sourceFormat;
}
