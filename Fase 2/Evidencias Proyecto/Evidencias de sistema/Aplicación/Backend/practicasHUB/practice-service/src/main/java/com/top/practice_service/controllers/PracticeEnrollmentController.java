package com.top.practice_service.controllers;

import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.services.PracticeEnrollmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/enrollments")
public class PracticeEnrollmentController {
    @Autowired
    private PracticeEnrollmentService enrollmentService;

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

    @GetMapping("/group/{groupId}/pending")
    public ResponseEntity<?> getPendingStudents(@PathVariable Long groupId, @RequestHeader("X-User-Id") Long professorId, @RequestHeader("X-User-Role")  String role) {
        if (role == null || (!role.equalsIgnoreCase("PROFESOR"))){
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo profesores pueden revisar postulaciones");
        }

        try{
            return ResponseEntity.ok(enrollmentService.getPendingEnrollment(groupId, professorId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{enrollmentId}/status")
    public ResponseEntity<?> changeStatus(@PathVariable Long enrollmentId, @RequestParam String status, @RequestHeader("X-User-Id") Long professorId, @RequestHeader("X-User-Role")  String role) {
        if (role == null || (!role.equalsIgnoreCase("PROFESOR"))){
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo profesores pueden aprobar postulaciones");
        }

        try{
            return ResponseEntity.ok(enrollmentService.updateEnrollmentStatus(enrollmentId, status, professorId));
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
}
