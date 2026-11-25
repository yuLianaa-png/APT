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
public class ItemAnswerDTO {
    private Double grade;
    private Boolean notApplicable;
    private String text;
    private List<ActivityAnswerDTO> activities = new ArrayList<>();
}
