package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

//una conversacion del grupo, para la bandeja del docente
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class ConversationDTO {
    private Long enrollmentId;
    private Long studentId;
    private String studentName;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private long unread;
    private String riskLevel;
}
