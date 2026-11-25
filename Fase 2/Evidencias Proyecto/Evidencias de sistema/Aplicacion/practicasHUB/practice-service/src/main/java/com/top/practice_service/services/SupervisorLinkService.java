package com.top.practice_service.services;

import com.top.practice_service.exceptions.InvalidLinkException;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.SupervisorAccessToken;
import com.top.practice_service.repositories.SupervisorAccessTokenRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
public class SupervisorLinkService {
    public static final String VALIDATION = "VALIDACION";
    public static final String EVALUATION = "EVALUACION";
    private static final int VALID_DAYS = 7;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired
    private SupervisorAccessTokenRepository tokenRepository;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    //crea un enlace nuevo y devuelve el token en claro (no se puede recuperar despues)
    public String issue(PracticeEnrollment enrollment, String purpose) {
        return issue(enrollment, purpose, null);
    }

    //enlace de evaluacion: ademas de la vinculacion, queda atado a una evaluacion
    public String issue(PracticeEnrollment enrollment, String purpose, Long evaluationId) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        LocalDateTime now = LocalDateTime.now();
        tokenRepository.save(new SupervisorAccessToken(null, enrollment.getEnrollmentId(), hash(token), purpose,
                enrollment.getSupervisorEmail(), now, now.plusDays(VALID_DAYS), null, null, evaluationId));
        return token;
    }

    public SupervisorAccessToken resolve(String token, String purpose, PracticeEnrollment enrollment) {
        SupervisorAccessToken access = find(token, purpose);
        if (enrollment == null || enrollment.getSupervisorEmail() == null
                || !enrollment.getSupervisorEmail().equalsIgnoreCase(access.getSupervisorEmail())) {
            throw new InvalidLinkException();
        }
        access.setLastUsedAt(LocalDateTime.now());
        return tokenRepository.save(access);
    }

    public SupervisorAccessToken find(String token, String purpose) {
        if (token == null || token.isBlank() || token.length() > 100) throw new InvalidLinkException();
        SupervisorAccessToken access = tokenRepository.findByTokenHash(hash(token))
                .orElseThrow(InvalidLinkException::new);
        if (!purpose.equals(access.getPurpose()) || access.getRevokedAt() != null
                || access.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new InvalidLinkException();
        }
        return access;
    }

    public LocalDateTime expiresAt() {
        return LocalDateTime.now().plusDays(VALID_DAYS);
    }

    public String evaluationUrlFor(String token) {
        return urlFor("evaluacion/" + token);
    }

    public String urlFor(String token) {
        String base = frontendUrl == null || frontendUrl.isBlank() ? "http://localhost:5173" : frontendUrl.trim();
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        return base + "/supervisor/" + token;
    }

    //se usa cuando cambia el supervisor - ningun enlace anterior sigue sirviendo
    public void revokeAll(Long enrollmentId) {
        List<SupervisorAccessToken> active = tokenRepository.findByEnrollmentIdAndRevokedAtIsNull(enrollmentId);
        LocalDateTime now = LocalDateTime.now();
        active.forEach(access -> access.setRevokedAt(now));
        if (!active.isEmpty()) tokenRepository.saveAll(active);
    }

    //se usa al eliminar un grupo
    public void deleteByEnrollment(Long enrollmentId) {
        tokenRepository.deleteAll(tokenRepository.findByEnrollmentId(enrollmentId));
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
