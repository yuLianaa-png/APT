package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

//mensaje entre el docente y un estudiante; el contenido se guarda cifrado (AES-GCM)
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "practice_messages")
public class PracticeMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id")
    private Long messageId;

    @Column(name = "enrollment_id", nullable = false)
    private Long enrollmentId;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    //ESTUDIANTE o PROFESOR
    @Column(name = "sender_role", length = 20)
    private String senderRole;

    //vector de inicializacion + texto cifrado, en base64
    @Column(name = "encrypted_content", columnDefinition = "TEXT", nullable = false)
    private String encryptedContent;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
    @Column(name = "read_at")
    private LocalDateTime readAt;
}
