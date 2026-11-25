package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

//respuestas de una seccion, en el mismo orden que sus criterios
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class SectionAnswersDTO {
    private List<ItemAnswerDTO> items = new ArrayList<>();
}
