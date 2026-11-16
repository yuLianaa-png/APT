package com.top.practice_service.controllers;

import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.repositories.PracticeGroupRepository;
import com.top.practice_service.services.PracticeGroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
public class PracticeGroupController {

    @Autowired
    private PracticeGroupService practiceGroupService;

    @PostMapping("/create")
    public ResponseEntity<?> createGroup(@RequestBody PracticeGroup group,
                                         @RequestHeader("X-User-Id") Long userId,
                                         @RequestHeader("X-User-Role") String role) {

        if (role == null || !role.equalsIgnoreCase("PROFESOR")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo los profesores pueden crear grupos.");
        }

        PracticeGroup savedGroup = practiceGroupService.withProfessorName(practiceGroupService.createGroup(group, userId));
        return ResponseEntity.ok(savedGroup);
    }

    @GetMapping("/my-groups")
    public ResponseEntity<?> getMyGroups(@RequestHeader("X-User-Id") Long professorId,
                                         @RequestHeader("X-User-Role") String role) {

        if (role == null || (!role.equalsIgnoreCase("PROFESOR"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo los profesores pueden ver sus grupos.");
        }

        return ResponseEntity.ok(practiceGroupService.withProfessorName(practiceGroupService.getGroupsByProfessor(professorId)));
    }

    //el docente se toma del token el X-User-Id, no de la URL, asi nadie cambia el estado de un grupo ajeno
    @PutMapping("/{groupId}/toggle-status")
    public ResponseEntity<?> toggleGroupStatus(
            @PathVariable Long groupId,
            @RequestHeader("X-User-Id") Long professorId,
            @RequestHeader("X-User-Role") String role) {

        if (!"PROFESOR".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("ACCESO DENEGADO: Solo los profesores pueden administrar el estado de sus grupos.");
        }

        try {
            return ResponseEntity.ok(practiceGroupService.withProfessorName(practiceGroupService.toggleGroupStatus(groupId, professorId)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Un usuario solo ve los grupos que la corresponden, porque el grupo incluye su codigo de vinculacion.
    //docente - fecha de termino del grupo: {"endDate": "2026-12-20"} o {"endDate": null} para quitarla
    @PutMapping("/{groupId}/end-date")
    public ResponseEntity<?> updateEndDate(@PathVariable Long groupId,
                                           @RequestBody java.util.Map<String, String> payload,
                                           @RequestHeader("X-User-Id") Long professorId,
                                           @RequestHeader("X-User-Role") String role) {
        if (!"PROFESOR".equalsIgnoreCase(role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO: Solo los profesores pueden cambiar la fecha de término.");
        }
        try {
            String value = payload.get("endDate");
            java.time.LocalDate endDate = (value == null || value.isBlank()) ? null : java.time.LocalDate.parse(value);
            return ResponseEntity.ok(practiceGroupService.withProfessorName(
                    practiceGroupService.updateEndDate(groupId, professorId, endDate)));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest().body("La fecha de término no es válida.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<?> getGroupById(@PathVariable Long groupId,
                                          @RequestHeader(value = "X-User-Id", required = false) Long userId,
                                          @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (userId == null) {
            //llamada interna: no hace falta el nombre del docente
            return ResponseEntity.ok(practiceGroupService.getGroupById(groupId));
        }
        if (!practiceGroupService.canAccessGroup(groupId, userId, role)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ACCESO DENEGADO: No tienes acceso a este grupo.");
        }
        return ResponseEntity.ok(practiceGroupService.withProfessorName(practiceGroupService.getGroupById(groupId)));
    }

    @DeleteMapping("/{groupId}")
    public ResponseEntity<?> deleteGroup(
            @PathVariable Long groupId,
            @RequestHeader("X-User-Id") Long authenticatedUserId,
            @RequestHeader("X-User-Role") String authenticatedUserRole) {

        try {
            if (!"PROFESOR".equalsIgnoreCase(authenticatedUserRole)) {
                return ResponseEntity.status(403).body("ACCION DENEGADA: Solo los profesores pueden eliminar grupos.");
            }

            practiceGroupService.deleteGroup(groupId, authenticatedUserId);

            return ResponseEntity.ok().body("Grupo eliminado exitosamente.");

        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al eliminar el grupo: " + e.getMessage());
        }
    }
}
