package com.top.document_service.DTO;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class PracticeGroupDTO {
    private Long idGroup;
    private String courseName;
    private String groupCode;
    private String status;
    private Long idProfessor;
}
