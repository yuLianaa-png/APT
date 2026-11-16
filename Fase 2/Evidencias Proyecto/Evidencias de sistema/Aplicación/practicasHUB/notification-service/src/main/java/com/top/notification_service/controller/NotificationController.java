package com.top.notification_service.controller;

import com.top.notification_service.models.Notification;
import com.top.notification_service.services.NotificationService;
import org.springframework.beans.factory.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    @Autowired
    private NotificationService notificationService;

    private boolean isOwner(Long userId, Long authenticatedUserId) {
        return authenticatedUserId != null && authenticatedUserId.equals(userId);
    }

    private ResponseEntity<?> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO: Solo puedes ver tus propias notificaciones.");
    }

    private boolean isExternalRequest(Long authenticatedUserId) {
        return authenticatedUserId != null;
    }

    @PostMapping("/send")
    public ResponseEntity<?> sendNotification(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @RequestParam Long userId,
            @RequestParam Long groupId,
            @RequestParam String groupName,
            @RequestParam String groupCode,
            @RequestParam String type,
            @RequestParam String title,
            @RequestParam String message,
            @RequestParam(required = false) String actionUrl,
            @RequestParam(required = false) Long referenceId) {
        if (isExternalRequest(authenticatedUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO.");
        }
        return ResponseEntity.ok(notificationService.createNotification(userId, groupId, groupName, groupCode, type, title, message, actionUrl, referenceId));
    }

    //front lista
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserNotifications(@PathVariable Long userId,
                                                  @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId) {
        if (!isOwner(userId, authenticatedUserId)) return forbidden();
        return ResponseEntity.ok(notificationService.getUserNotifications(userId));
    }

    @GetMapping("/user/{userId}/group/{groupId}")
    public ResponseEntity<?> getGroupNotifications(@PathVariable Long userId, @PathVariable Long groupId,
                                                   @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId) {
        if (!isOwner(userId, authenticatedUserId)) return forbidden();
        return ResponseEntity.ok(notificationService.getGroupNotifications(userId, groupId));
    }

    //front numero campanita
    @GetMapping("/user/{userId}/unread-count")
    public ResponseEntity<?> getUnreadCount(@PathVariable Long userId,
                                            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId) {
        if (!isOwner(userId, authenticatedUserId)) return forbidden();
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    //click campanita
    @PutMapping("/user/{userId}/mark-read")
    public ResponseEntity<?> markAllAsRead(@PathVariable Long userId,
                                           @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId) {
        if (!isOwner(userId, authenticatedUserId)) return forbidden();
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    //front numero campanita dentro de un grupo
    @GetMapping("/user/{userId}/group/{groupId}/unread-count")
    public ResponseEntity<?> getGroupUnreadCount(@PathVariable Long userId, @PathVariable Long groupId,
                                                 @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId) {
        if (!isOwner(userId, authenticatedUserId)) return forbidden();
        return ResponseEntity.ok(notificationService.getGroupUnreadCount(userId, groupId));
    }

    //al abrir las notificaciones del grupo
    @PutMapping("/user/{userId}/group/{groupId}/mark-read")
    public ResponseEntity<?> markGroupAsRead(@PathVariable Long userId, @PathVariable Long groupId,
                                             @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId) {
        if (!isOwner(userId, authenticatedUserId)) return forbidden();
        notificationService.markGroupAsRead(userId, groupId);
        return ResponseEntity.ok().build();
    }

    //solo para los otros microservicios
    @PostMapping("/send-bulk")
    public ResponseEntity<?> sendBulkNotification(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @RequestParam List<Long> userIds,
            @RequestParam Long groupId,
            @RequestParam String groupName,
            @RequestParam String groupCode,
            @RequestParam String type,
            @RequestParam String title,
            @RequestParam String message,
            @RequestParam(required = false) String actionUrl,
            @RequestParam(required = false) Long referenceId) {
        if (isExternalRequest(authenticatedUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO.");
        }
        notificationService.createBulkNotifications(userIds, groupId, groupName, groupCode, type, title, message, actionUrl, referenceId);
        return ResponseEntity.ok().build();
    }
}
