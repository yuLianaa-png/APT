package com.top.notification_service.services;

import com.top.notification_service.models.Notification;
import com.top.notification_service.repositories.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {
    @Autowired
    private NotificationRepository notificationRepository;

    public Notification createNotification(Long userId, String type, String title, String message, String actionUrl) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setActionUrl(actionUrl);
        return notificationRepository.save(notification);
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public void markAllAsRead(Long userId) {
        List<Notification> unreadDocs = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .filter(n -> !n.getRead())
                .toList();

        unreadDocs.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unreadDocs);
    }

    public void createBulkNotifications(List<Long> userIds, String type, String title, String message, String actionUrl) {
        List<Notification> notifications = userIds.stream().map(userId -> {
            Notification n = new Notification();
            n.setUserId(userId);
            n.setType(type);
            n.setTitle(title);
            n.setMessage(message);
            n.setActionUrl(actionUrl);
            return n;
        }).toList();

        notificationRepository.saveAll(notifications);
    }
}
