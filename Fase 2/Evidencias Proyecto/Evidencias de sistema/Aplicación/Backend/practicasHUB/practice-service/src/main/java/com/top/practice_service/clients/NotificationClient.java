package com.top.practice_service.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "notification-service", url = "http://practicahub-notification:8084")
public interface NotificationClient {
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
