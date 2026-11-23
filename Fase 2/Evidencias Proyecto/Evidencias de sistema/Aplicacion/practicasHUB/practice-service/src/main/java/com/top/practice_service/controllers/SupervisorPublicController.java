package com.top.practice_service.controllers;

import com.top.practice_service.exceptions.InvalidLinkException;
import com.top.practice_service.services.SupervisorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

//endpoints que usa el supervisor desde el enlace del correo. no llevan JWT, el api-gateway los deja pasar sin sesion y el acceso lo da el token del enlace. nunca se leen X-User-Id / X-User-Role.
@RestController
@RequestMapping("/api/public/supervisor")
public class SupervisorPublicController {
    @Autowired
    private SupervisorService supervisorService;

    @GetMapping("/{token}")
    public ResponseEntity<?> view(@PathVariable String token) {
        return handle(() -> supervisorService.publicView(token));
    }

    @PostMapping("/{token}/logs")
    public ResponseEntity<?> review(@PathVariable String token, @RequestBody Map<String, Object> payload) {
        return handle(() -> supervisorService.publicReview(token, idsOf(payload.get("validate")),
                observationsOf(payload.get("observe"))));
    }

    private ResponseEntity<?> handle(Supplier<?> action) {
        try {
            return ResponseEntity.ok(action.get());
        } catch (InvalidLinkException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private static List<Long> idsOf(Object value) {
        List<Long> ids = new ArrayList<>();
        if (value instanceof List<?> list) {
            for (Object item : list) ids.add(Long.valueOf(item.toString()));
        }
        return ids;
    }

    private static Map<Long, String> observationsOf(Object value) {
        Map<Long, String> observations = new LinkedHashMap<>();
        if (value instanceof List<?> list) {
            for (Object item : list) {
                if (!(item instanceof Map<?, ?> entry) || entry.get("logId") == null) {
                    throw new IllegalArgumentException("Observación sin jornada.");
                }
                Object comment = entry.get("comment");
                observations.put(Long.valueOf(entry.get("logId").toString()), comment == null ? null : comment.toString());
            }
        }
        return observations;
    }
}
