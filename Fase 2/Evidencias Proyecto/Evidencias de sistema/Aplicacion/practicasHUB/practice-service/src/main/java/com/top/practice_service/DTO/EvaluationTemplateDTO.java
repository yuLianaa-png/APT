package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

//pauta completa. se recibe al guardar un borrador y se devuelve al consultar
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class EvaluationTemplateDTO {
    private Long templateId;
    private String slot;
    private Integer version;
    private String status;
    private Boolean locked;
    private String instructions;
    private List<TemplateSectionDTO> sections = new ArrayList<>();
    private LocalDateTime updatedAt;
    private LocalDateTime publishedAt;
}
