package com.top.document_service.clients;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "practice-service", url = "http://practicahub-practice:8082")
public interface PracticeClient {
    @GetMapping("/api/enrollments/group/{groupId}/student-ids")
    List<Long> getStudentIdsByGroup(@PathVariable("groupId") Long groupId);
}
