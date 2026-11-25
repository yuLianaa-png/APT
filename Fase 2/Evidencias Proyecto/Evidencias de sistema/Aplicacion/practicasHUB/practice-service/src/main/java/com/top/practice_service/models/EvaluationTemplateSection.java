package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "evaluation_template_sections")
public class EvaluationTemplateSection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sectionId;

    private Integer position;
    @Column(length = 150)
    private String title;
    private boolean countsForFinal;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "section_id")
    @OrderBy("position")
    private List<EvaluationTemplateItem> items = new ArrayList<>();
}
