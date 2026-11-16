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
@Table(name = "student_group")
public class StudentGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idStudentGroup;

    @ManyToOne
    @JoinColumn(name = "group_id", nullable = false)
    private PracticeGroup practiceGroup;

    @Column(nullable = false)
    private Long idStudent;

    @Column(length = 20)
    private String status;

    private LocalDateTime connectionDate = LocalDateTime.now();

}
