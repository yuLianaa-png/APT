package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

//respuestas de una evaluacion, en el mismo orden que las secciones de la pauta
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class EvaluationAnswersDTO {
    private List<SectionAnswersDTO> sections = new ArrayList<>();
}
