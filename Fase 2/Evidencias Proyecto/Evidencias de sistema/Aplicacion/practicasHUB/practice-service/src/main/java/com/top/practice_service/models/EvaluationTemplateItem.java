package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "evaluation_template_items")
public class EvaluationTemplateItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long itemId;

    private Integer position;
    @Column(length = 20)
    private String type;
    @Column(columnDefinition = "TEXT")
    private String label;
    private boolean allowNotApplicable; //el supervisor puede responder "No aplica" (y no cuenta para el promedio)
    private Double weight;
    private Integer sourceSection;
    private Integer minActivities;
}
