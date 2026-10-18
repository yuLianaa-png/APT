package com.top.practice_service.models;

import jakarta.persistence.*;

@Entity
@Table(name = "Connection")
public class Connection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "group_id", nullable = false)
    private PracticeGroup practiceGroup;

}
