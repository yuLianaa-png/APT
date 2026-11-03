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

        PracticeGroup savedGroup = practiceGroupService.createGroup(group, userId);
        return ResponseEntity.ok(savedGroup);
    }

    @GetMapping("/my-groups")
    public ResponseEntity<?> getMyGroups(@RequestHeader("X-User-Id") Long professorId,
                                         @RequestHeader("X-User-Role") String role) {

        if (role == null || (!role.equalsIgnoreCase("PROFESOR"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("ERROR: Solo los profesores pueden ver sus grupos.");
        }

        return ResponseEntity.ok(practiceGroupService.getGroupsByProfessor(professorId));
    }
}
