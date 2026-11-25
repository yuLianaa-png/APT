package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "evaluation_answers")
public class EvaluationAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long answerId;

    private Long evaluationId;
    private Integer sectionIndex;
    private Integer itemIndex;
    private Integer activityIndex;

    private Double grade;
    private boolean notApplicable;
    @Column(columnDefinition = "TEXT")
    private String text;
}
