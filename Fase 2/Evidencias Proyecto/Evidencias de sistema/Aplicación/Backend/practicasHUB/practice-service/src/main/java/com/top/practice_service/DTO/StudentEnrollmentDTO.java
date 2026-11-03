package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class StudentEnrollmentDTO {
    private Long enrollmentId;
    private String status;
    private LocalDateTime enrollmentDate;

    private String groupCode;
    private String courseName;
    private String description;
    private String period;
    private Long idProfessor;
}
