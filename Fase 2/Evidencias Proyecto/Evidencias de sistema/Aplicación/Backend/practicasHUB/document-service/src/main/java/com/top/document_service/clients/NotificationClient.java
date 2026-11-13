package com.top.document_service.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "notification-service", url = "http://practicahub-notification:8084")
public interface NotificationClient {
    @PostMapping("/api/notifications/send-bulk")
    void sendBulkNotification(
            @RequestParam("userIds") List<Long> userIds,
            @RequestParam("groupId") Long groupId,
            @RequestParam("groupName") String groupName,
            @RequestParam("groupCode") String groupCode,
            @RequestParam("type") String type,
            @RequestParam("title") String title,
            @RequestParam("message") String message,
            @RequestParam(value = "actionUrl", required = false) String actionUrl);

    @PostMapping("/api/notifications/send")
    void sendNotification(
            @RequestParam("userId") Long userId,
            @RequestParam("groupId") Long groupId,
            @RequestParam("groupName") String groupName,
            @RequestParam("groupCode") String groupCode,
            @RequestParam("type") String type,
            @RequestParam("title") String title,
            @RequestParam("message") String message,
            @RequestParam(value = "actionUrl", required = false) String actionUrl);
}
