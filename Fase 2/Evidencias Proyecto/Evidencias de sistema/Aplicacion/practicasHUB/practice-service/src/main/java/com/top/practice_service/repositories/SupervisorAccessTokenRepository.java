package com.top.practice_service.repositories;

import com.top.practice_service.models.SupervisorAccessToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupervisorAccessTokenRepository extends JpaRepository<SupervisorAccessToken, Long> {
    Optional<SupervisorAccessToken> findByTokenHash(String tokenHash);
    List<SupervisorAccessToken> findByEnrollmentIdAndRevokedAtIsNull(Long enrollmentId);
    List<SupervisorAccessToken> findByEnrollmentId(Long enrollmentId);
}
