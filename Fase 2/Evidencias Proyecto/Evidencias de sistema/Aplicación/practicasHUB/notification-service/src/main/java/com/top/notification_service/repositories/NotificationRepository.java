package com.top.notification_service.repositories;

import com.top.notification_service.models.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserIdAndReadFalse(Long userId);
    List<Notification> findByUserIdAndGroupIdOrderByCreatedAtDesc(Long userId, Long groupId);
    long countByUserIdAndGroupIdAndReadFalse(Long userId, Long groupId);
    List<Notification> findByUserIdAndReadFalse(Long userId);
    List<Notification> findByUserIdAndGroupIdAndReadFalse(Long userId, Long groupId);
}
