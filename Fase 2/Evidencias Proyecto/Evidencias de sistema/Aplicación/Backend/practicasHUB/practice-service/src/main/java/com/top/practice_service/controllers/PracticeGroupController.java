package com.top.practice_service.controllers;

import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.repositories.PracticeGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("api/groups")
public class PracticeGroupController {
    @Autowired
    private PracticeGroupRepository practiceGroupRepository;

    @PostMapping("/create")
    public ResponseEntity<PracticeGroup> createGroup(@RequestBody PracticeGroup group) {
        if(group.getGroupCode() == null || group.getGroupCode().isEmpty()){
            String generatedCode = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            group.setGroupCode(generatedCode);
        }

        PracticeGroup savedGroup = practiceGroupRepository.save(group);
        return ResponseEntity.ok(savedGroup);
    }
}
