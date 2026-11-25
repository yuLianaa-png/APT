package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

//actividad que escribe el supervisor, con su nota
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class ActivityAnswerDTO {
    private String description;
    private Double grade;
}
