package com.top.practice_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class MessageDTO {
    private Long messageId;
    private Long enrollmentId;
    private Long senderId;
    private String senderRole;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}
