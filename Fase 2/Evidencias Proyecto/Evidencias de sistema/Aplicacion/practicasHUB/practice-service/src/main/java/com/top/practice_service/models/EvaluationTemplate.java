package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "evaluation_templates")
public class EvaluationTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long templateId;

    private Long groupId;
    @Column(length = 20)
    private String slot;
    private Integer version;
    @Column(length = 20)
    private String status;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    private boolean locked;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime publishedAt;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "template_id")
    @OrderBy("position")
    private List<EvaluationTemplateSection> sections = new ArrayList<>();
}
