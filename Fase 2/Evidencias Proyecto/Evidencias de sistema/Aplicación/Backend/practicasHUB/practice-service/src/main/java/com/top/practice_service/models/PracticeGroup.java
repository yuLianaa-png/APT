package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "practice_group")
public class PracticeGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "group_id", nullable = false)
    private Long idGroup;

    @Column(unique = true, nullable = false)
    private String groupCode;

    @Column(name = "id_professor", nullable = false)
    private Long idProfessor;

    @Column(length = 150)
    private String courseName;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Integer minimumHours;

    @Column(length = 50)
    private String period;

    @Column(length = 20)
    private String status;

    private LocalDateTime creationDate = LocalDateTime.now();
}
