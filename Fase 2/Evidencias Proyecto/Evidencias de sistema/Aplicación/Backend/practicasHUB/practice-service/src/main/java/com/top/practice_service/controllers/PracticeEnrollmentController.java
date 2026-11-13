package com.top.practice_service.controllers;

import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.services.PracticeEnrollmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/enrollments")
public class PracticeEnrollmentController {
    @Autowired
    private PracticeEnrollmentService enrollmentService;
    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;

    @PostMapping("/join/{groupCode}")
    public ResponseEntity<?> enrollInGroup(@PathVariable String groupCode,
                                           @RequestHeader("X-User-Id") Long studentId,
                                           @RequestHeader("X-User-Role") String role) {

        if (role == null || (!role.equalsIgnoreCase("ESTUDIANTE"))){
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Error: Solo los estudiantes pueden unirse a las prácticas.");
        }

        try {
            PracticeEnrollment enrollment = enrollmentService.enrollStudent(groupCode, studentId);
            return ResponseEntity.ok(enrollment);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }


    @GetMapping("/my-enrollments")
    public ResponseEntity<?> getMyEnrollments(@RequestHeader("X-User-Id") Long studentId,
                                              @RequestHeader("X-User-Role") String role) {

        if (role == null || (!role.equalsIgnoreCase("ESTUDIANTE"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Error: Solo los estudiantes pueden ver sus postulaciones.");
        }

        return ResponseEntity.ok(enrollmentService.getStudentEnrollments(studentId));
    }

    @GetMapping("/group/{groupId}/student-ids")
    public ResponseEntity<List<Long>> getStudentIdsByGroup(@PathVariable Long groupId) {
        List<Long> studentIds = enrollmentRepository.findByPracticeGroupId(groupId)
                .stream()
                .map(PracticeEnrollment::getStudentId)
                .toList();
        return ResponseEntity.ok(studentIds);
    }

    @GetMapping("/{enrollmentId}/student-id")
    public ResponseEntity<Long> getStudentIdByEnrollment(@PathVariable Long enrollmentId) {
        try {
            Long studentId = enrollmentService.getStudentIdByEnrollment(enrollmentId);
            return ResponseEntity.ok(studentId);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }
}
