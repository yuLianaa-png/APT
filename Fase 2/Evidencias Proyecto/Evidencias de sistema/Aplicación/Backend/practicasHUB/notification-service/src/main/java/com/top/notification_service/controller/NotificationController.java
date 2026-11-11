package com.top.notification_service.controller;

import com.top.notification_service.models.Notification;
import com.top.notification_service.services.NotificationService;
import org.springframework.beans.factory.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    @Autowired
    private NotificationService notificationService;

    @PostMapping("/send")
    public ResponseEntity<Notification> sendNotification(
            @RequestParam Long userId,
            @RequestParam String type,
            @RequestParam String title,
            @RequestParam String message,
            @RequestParam(required = false) String actionUrl) {
        return ResponseEntity.ok(notificationService.createNotification(userId, type, title, message, actionUrl));
    }

    //front pintar lista
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getUserNotifications(@PathVariable Long userId) {
        return ResponseEntity.ok(notificationService.getUserNotifications(userId));
    }

    //front numero campanita
    @GetMapping("/user/{userId}/unread-count")
    public ResponseEntity<Long> getUnreadCount(@PathVariable Long userId) {
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    //click campanita
    @PutMapping("/user/{userId}/mark-read")
    public ResponseEntity<?> markAllAsRead(@PathVariable Long userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/send-bulk")
    public ResponseEntity<?> sendBulkNotification(
            @RequestParam List<Long> userIds,
            @RequestParam String type,
            @RequestParam String title,
            @RequestParam String message,
            @RequestParam(required = false) String actionUrl) {
        notificationService.createBulkNotifications(userIds, type, title, message, actionUrl);
        return ResponseEntity.ok().build();
    }
}
