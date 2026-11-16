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
public class RiskDTO {
    //SIN_ALERTA, ATENCION o RIESGO
    private String level;
    private List<String> reasons;
}
