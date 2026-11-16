package com.top.practice_service.controllers;

import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.services.PracticeEnrollmentService;
import com.top.practice_service.services.PracticeGroupService;
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
    @Autowired
    private PracticeGroupService practiceGroupService;

    private boolean isExternalRequest(Long userId) {
        return userId != null;
    }

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


    //estudiante - vista previa del grupo antes de confirmar la vinculacion
    @GetMapping("/preview/{groupCode}")
    public ResponseEntity<?> previewGroup(@PathVariable String groupCode,
                                          @RequestHeader("X-User-Id") Long studentId,
                                          @RequestHeader("X-User-Role") String role) {

        if (role == null || (!role.equalsIgnoreCase("ESTUDIANTE"))){
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Error: Solo los estudiantes pueden unirse a las prácticas.");
        }

        try {
            return ResponseEntity.ok(practiceGroupService.withProfessorName(enrollmentService.previewGroup(groupCode, studentId)));
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

    //lo usa el front (docente del grupo o estudiante vinculado) y los otros microservicios
    @GetMapping("/group/{groupId}/student-ids")
    public ResponseEntity<?> getStudentIdsByGroup(@PathVariable Long groupId,
                                                  @RequestHeader(value = "X-User-Id", required = false) Long userId,
                                                  @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (isExternalRequest(userId) && !practiceGroupService.canAccessGroup(groupId, userId, role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO: No tienes acceso a este grupo.");
        }
        List<Long> studentIds = enrollmentRepository.findByPracticeGroupId(groupId)
                .stream()
                .map(PracticeEnrollment::getStudentId)
                .toList();
        return ResponseEntity.ok(studentIds);
    }

    //docente - padron del grupo con horas y solicitudes de cada estudiante
    @GetMapping("/group/{groupId}/students")
    public ResponseEntity<?> getGroupStudents(@PathVariable Long groupId,
                                              @RequestHeader("X-User-Id") Long professorId,
                                              @RequestHeader("X-User-Role") String role) {

        if (role == null || (!role.equalsIgnoreCase("PROFESOR"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Error: Solo los profesores pueden ver los estudiantes del grupo.");
        }

        try {
            return ResponseEntity.ok(enrollmentService.getGroupStudents(groupId, professorId));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    //interno
    @GetMapping("/{enrollmentId}/student-id")
    public ResponseEntity<Long> getStudentIdByEnrollment(@PathVariable Long enrollmentId,
                                                         @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (isExternalRequest(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        try {
            Long studentId = enrollmentService.getStudentIdByEnrollment(enrollmentId);
            return ResponseEntity.ok(studentId);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    //interno - grupo al que pertenece una inscripcion
    @GetMapping("/{enrollmentId}/group-id")
    public ResponseEntity<Long> getGroupIdByEnrollment(@PathVariable Long enrollmentId,
                                                       @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        if (isExternalRequest(userId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        return enrollmentRepository.findById(enrollmentId)
                .map(enrollment -> ResponseEntity.ok(enrollment.getPracticeGroupId()))
                .orElse(ResponseEntity.notFound().build());
    }
}
