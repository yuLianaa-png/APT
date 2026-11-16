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

    public Notification createNotification(Long userId, Long groupId, String groupName, String groupCode, String type, String title, String message, String actionUrl, Long referenceId) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setGroupId(groupId);
        notification.setGroupName(groupName);
        notification.setGroupCode(groupCode);
        notification.setType(type);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setActionUrl(actionUrl);
        notification.setReferenceId(referenceId);
        return notificationRepository.save(notification);
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getGroupNotifications(Long userId, Long groupId) {
        return notificationRepository.findByUserIdAndGroupIdOrderByCreatedAtDesc(userId, groupId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    public void markAllAsRead(Long userId) {
        List<Notification> unreadDocs = notificationRepository.findByUserIdAndReadFalse(userId);

        unreadDocs.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unreadDocs);
    }

    //contador de la campanita dentro de un grupo
    public long getGroupUnreadCount(Long userId, Long groupId) {
        return notificationRepository.countByUserIdAndGroupIdAndReadFalse(userId, groupId);
    }

    //marca como leidas solo las notificaciones de ese grupo
    public void markGroupAsRead(Long userId, Long groupId) {
        List<Notification> unreadDocs = notificationRepository.findByUserIdAndGroupIdAndReadFalse(userId, groupId);

        unreadDocs.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unreadDocs);
    }

    public void createBulkNotifications(List<Long> userIds, Long groupId, String groupName, String groupCode, String type, String title, String message, String actionUrl, Long referenceId) {
        List<Notification> notifications = userIds.stream().map(userId -> {
            Notification n = new Notification();
            n.setUserId(userId);
            n.setGroupId(groupId);
            n.setGroupName(groupName);
            n.setGroupCode(groupCode);
            n.setType(type);
            n.setTitle(title);
            n.setMessage(message);
            n.setActionUrl(actionUrl);
            n.setReferenceId(referenceId);
            return n;
        }).toList();
        notificationRepository.saveAll(notifications);
    }
}
