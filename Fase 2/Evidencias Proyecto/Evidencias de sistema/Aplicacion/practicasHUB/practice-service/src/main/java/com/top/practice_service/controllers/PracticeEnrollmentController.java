package com.top.practice_service.controllers;

import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.services.PracticeEnrollmentService;
import com.top.practice_service.services.PracticeGroupService;
import com.top.practice_service.services.PracticeMessageService;
import com.top.practice_service.services.RiskFollowUpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

@RestController
@RequestMapping("/api/enrollments")
public class PracticeEnrollmentController {
    @Autowired
    private PracticeEnrollmentService enrollmentService;
    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;
    @Autowired
    private PracticeGroupService practiceGroupService;
    @Autowired
    private RiskFollowUpService followUpService;
    @Autowired
    private PracticeMessageService messageService;

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

    //respuesta comun de los endpoints de seguimiento y mensajes
    private ResponseEntity<?> handle(Supplier<?> action) {
        try {
            return ResponseEntity.ok(action.get());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (DateTimeParseException e) {
            return ResponseEntity.badRequest().body("La fecha no es válida.");
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body("Las horas semanales deben ser un número.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private static LocalDate dateOf(Object value) {
        return value == null || value.toString().isBlank() ? null : LocalDate.parse(value.toString());
    }

    private static Double numberOf(Object value) {
        return value == null || value.toString().isBlank() ? null : Double.valueOf(value.toString().replace(',', '.'));
    }

    private static String textOf(Object value) {
        return value == null ? null : value.toString();
    }

    private ResponseEntity<?> onlyProfessors(String role) {
        return "PROFESOR".equalsIgnoreCase(role) ? null : ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body("Error: Solo los profesores pueden gestionar el seguimiento de los estudiantes.");
    }

    //docente - seguimiento de la alerta de un estudiante y su historial de acciones
    @GetMapping("/{enrollmentId}/follow-up")
    public ResponseEntity<?> getFollowUp(@PathVariable Long enrollmentId,
                                         @RequestHeader("X-User-Id") Long professorId,
                                         @RequestHeader("X-User-Role") String role) {
        ResponseEntity<?> denied = onlyProfessors(role);
        if (denied != null) return denied;
        return handle(() -> followUpService.getFollowUp(enrollmentId, professorId));
    }

    //docente - registra lo que hizo: contacto, acuerdo o nota
    @PostMapping("/{enrollmentId}/follow-up/actions")
    public ResponseEntity<?> addFollowUpAction(@PathVariable Long enrollmentId,
                                               @RequestBody Map<String, Object> payload,
                                               @RequestHeader("X-User-Id") Long professorId,
                                               @RequestHeader("X-User-Role") String role) {
        ResponseEntity<?> denied = onlyProfessors(role);
        if (denied != null) return denied;
        return handle(() -> followUpService.addAction(enrollmentId, professorId,
                textOf(payload.get("type")), textOf(payload.get("note")), dateOf(payload.get("commitmentDate"))));
    }

    //docente - cierra la alerta
    @PutMapping("/{enrollmentId}/follow-up/resolve")
    public ResponseEntity<?> resolveFollowUp(@PathVariable Long enrollmentId,
                                             @RequestBody(required = false) Map<String, Object> payload,
                                             @RequestHeader("X-User-Id") Long professorId,
                                             @RequestHeader("X-User-Role") String role) {
        ResponseEntity<?> denied = onlyProfessors(role);
        if (denied != null) return denied;
        return handle(() -> followUpService.resolve(enrollmentId, professorId,
                payload == null ? null : textOf(payload.get("note"))));
    }

    //docente - prorroga individual y horas semanales comprometidas
    @PutMapping("/{enrollmentId}/plan")
    public ResponseEntity<?> setPlan(@PathVariable Long enrollmentId,
                                     @RequestBody Map<String, Object> payload,
                                     @RequestHeader("X-User-Id") Long professorId,
                                     @RequestHeader("X-User-Role") String role) {
        ResponseEntity<?> denied = onlyProfessors(role);
        if (denied != null) return denied;
        return handle(() -> followUpService.setPlan(enrollmentId, professorId,
                dateOf(payload.get("endDate")), numberOf(payload.get("weeklyHours")), textOf(payload.get("note"))));
    }

    //estudiante de la vinculacion o docente del grupo - conversacion (marca como leido lo recibido)
    @GetMapping("/{enrollmentId}/messages")
    public ResponseEntity<?> getMessages(@PathVariable Long enrollmentId,
                                         @RequestHeader("X-User-Id") Long userId,
                                         @RequestHeader("X-User-Role") String role) {
        return handle(() -> messageService.getConversation(enrollmentId, userId, role));
    }

    @PostMapping("/{enrollmentId}/messages")
    public ResponseEntity<?> sendMessage(@PathVariable Long enrollmentId,
                                         @RequestBody Map<String, Object> payload,
                                         @RequestHeader("X-User-Id") Long userId,
                                         @RequestHeader("X-User-Role") String role) {
        return handle(() -> messageService.send(enrollmentId, userId, role, textOf(payload.get("content"))));
    }

    //docente - bandeja de mensajes del grupo
    @GetMapping("/group/{groupId}/conversations")
    public ResponseEntity<?> getConversations(@PathVariable Long groupId,
                                              @RequestHeader("X-User-Id") Long professorId,
                                              @RequestHeader("X-User-Role") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Error: Solo los profesores pueden ver la bandeja del grupo.");
        }
        return handle(() -> messageService.getGroupConversations(groupId, professorId));
    }
}
