package com.top.notification_service.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

//Ping de disponibilidad: responde "ok" y nada mas. Lo llama un servicio externo (cron-job.org)
//para despertar el servicio en Render antes de las tareas programadas.
@RestController
public class HealthController {
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("ok");
    }
}
