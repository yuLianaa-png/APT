package com.top.document_service.clients;

import com.top.document_service.DTO.PracticeGroupDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "practice-service", url = "http://practicahub-practice:8082")
public interface PracticeClient {
    @GetMapping("/api/enrollments/group/{groupId}/student-ids")
    List<Long> getStudentIdsByGroup(@PathVariable("groupId") Long groupId);

    @GetMapping("/api/groups/{groupId}")
    PracticeGroupDTO getGroupById(@PathVariable("groupId") Long groupId);

    @GetMapping("/api/enrollments/{enrollmentId}/student-id")
    Long getStudentIdByEnrollment(@PathVariable("enrollmentId") Long enrollmentId);
}
