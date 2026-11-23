package com.top.practice_service.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

//enlace de acceso del supervisor - solo se guarda el hash del token, nunca el token
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "supervisor_access_tokens")
public class SupervisorAccessToken {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long tokenId;

    private Long enrollmentId;

    @Column(name = "token_hash", length = 64, unique = true, nullable = false)
    private String tokenHash;

    @Column(length = 20)
    private String purpose;

    @Column(name = "supervisor_email", length = 150)
    private String supervisorEmail;

    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime revokedAt;
    private LocalDateTime lastUsedAt;
}
