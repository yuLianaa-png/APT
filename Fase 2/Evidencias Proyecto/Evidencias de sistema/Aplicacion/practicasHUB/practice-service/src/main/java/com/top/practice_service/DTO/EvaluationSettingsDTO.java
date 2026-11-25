package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class EvaluationSettingsDTO {
    private Long groupId;
    private String mode;
    private boolean modeEditable;
    private List<EvaluationSlotDTO> slots;
}
