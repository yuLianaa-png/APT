package com.top.practice_service.services;

import com.top.practice_service.DTO.FollowUpDTO;
import com.top.practice_service.DTO.RiskDTO;
import com.top.practice_service.clients.NotificationClient;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.models.RiskFollowUp;
import com.top.practice_service.models.RiskFollowUpAction;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import com.top.practice_service.repositories.PracticeLogRepository;
import com.top.practice_service.repositories.RiskFollowUpActionRepository;
import com.top.practice_service.repositories.RiskFollowUpRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

//Que hace el docente con una alerta: la alerta se abre sola, el docente registra lo que hizo
//(contacto, acuerdo, plan o prorroga) y se cierra cuando la resuelve o cuando el estudiante vuelve a estar al dia.
@Service
public class RiskFollowUpService {
    public static final String OPEN = "ABIERTA";
    public static final String IN_PROGRESS = "EN_SEGUIMIENTO";
    public static final String RESOLVED = "RESUELTA";

    private static final Set<String> MANUAL_ACTIONS = Set.of("CONTACTO", "ACUERDO", "NOTA");
    private static final int MAX_NOTE_LENGTH = 1000;
    private static final double MAX_WEEKLY_HOURS = 80;
    private static final ZoneId CHILE = ZoneId.of("America/Santiago");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired
    private RiskFollowUpRepository followUpRepository;
    @Autowired
    private RiskFollowUpActionRepository actionRepository;
    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;
    @Autowired
    private PracticeGroupRepository groupRepository;
    @Autowired
    private PracticeLogRepository logRepository;
    @Autowired
    private PracticeRiskService riskService;
    @Autowired
    private NotificationClient notificationClient;

    //abre la alerta si aparece y la cierra sola si el estudiante vuelve a estar al dia
    public RiskFollowUp sync(PracticeEnrollment enrollment, RiskDTO risk) {
        RiskFollowUp current = followUpRepository
                .findFirstByEnrollmentIdAndStatusNotOrderByOpenedAtDesc(enrollment.getEnrollmentId(), RESOLVED)
                .orElse(null);
        boolean hasAlert = !PracticeRiskService.NO_ALERT.equals(risk.getLevel());
        LocalDateTime now = LocalDateTime.now();

        if (hasAlert && current == null) {
            current = new RiskFollowUp(null, enrollment.getEnrollmentId(), OPEN, risk.getLevel(), now, now, null);
            return followUpRepository.save(current);
        }
        if (hasAlert && PracticeRiskService.RISK.equals(risk.getLevel()) && !PracticeRiskService.RISK.equals(current.getLevel())) {
            current.setLevel(risk.getLevel());
            current.setUpdatedAt(now);
            return followUpRepository.save(current);
        }
        //solo se cierra sola la que abrio una alerta; un plan preventivo sigue abierto hasta que el docente lo cierre
        if (!hasAlert && current != null && !PracticeRiskService.NO_ALERT.equals(current.getLevel())) {
            close(current, null, "Se cerró automáticamente: el estudiante volvió a estar al día.");
            return null;
        }
        return current;
    }

    //estado actual del seguimiento, sin tocar nada (para listados)
    public String currentStatus(Long enrollmentId) {
        return followUpRepository.findFirstByEnrollmentIdOrderByOpenedAtDesc(enrollmentId)
                .map(RiskFollowUp::getStatus)
                .orElse(null);
    }

    public FollowUpDTO getFollowUp(Long enrollmentId, Long professorId) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        PracticeGroup group = ownedGroup(enrollment, professorId);
        RiskDTO risk = riskService.evaluate(group, enrollment, logRepository.findByIdEnrollment(enrollmentId));
        sync(enrollment, risk);
        return toDTO(enrollment, risk);
    }

    public FollowUpDTO addAction(Long enrollmentId, Long professorId, String type, String note, LocalDate commitmentDate) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        PracticeGroup group = activeOwnedGroup(enrollment, professorId);

        String action = type == null ? "" : type.trim().toUpperCase();
        if (!MANUAL_ACTIONS.contains(action)) {
            throw new IllegalArgumentException("Elige el tipo de acción: contacto, acuerdo o nota.");
        }
        String text = cleanNote(note, true);
        if (commitmentDate != null && commitmentDate.isBefore(LocalDate.now(CHILE))) {
            throw new IllegalArgumentException("La fecha de compromiso no puede ser anterior a hoy.");
        }

        RiskFollowUp followUp = openOrCreate(enrollment);
        saveAction(followUp, enrollmentId, professorId, action, text, commitmentDate);
        return toDTO(enrollment, evaluate(group, enrollment));
    }

    public FollowUpDTO resolve(Long enrollmentId, Long professorId, String note) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        PracticeGroup group = activeOwnedGroup(enrollment, professorId);

        RiskFollowUp followUp = followUpRepository
                .findFirstByEnrollmentIdAndStatusNotOrderByOpenedAtDesc(enrollmentId, RESOLVED)
                .orElseThrow(() -> new IllegalArgumentException("Este estudiante no tiene una alerta abierta."));
        String text = cleanNote(note, false);
        close(followUp, professorId, text.isEmpty() ? "El docente marcó la alerta como resuelta." : text);
        return toDTO(enrollment, evaluate(group, enrollment));
    }

    //prorroga individual y/o horas semanales comprometidas; los dos en null quitan el plan
    public FollowUpDTO setPlan(Long enrollmentId, Long professorId, LocalDate endDate, Double weeklyHours, String note) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        PracticeGroup group = activeOwnedGroup(enrollment, professorId);
        LocalDate today = LocalDate.now(CHILE);

        if (endDate != null && endDate.isBefore(today)) {
            throw new IllegalArgumentException("La nueva fecha de término no puede ser anterior a hoy.");
        }
        if (weeklyHours != null && (weeklyHours <= 0 || weeklyHours > MAX_WEEKLY_HOURS)) {
            throw new IllegalArgumentException("Las horas semanales deben ser mayores que 0 y como máximo " + (int) MAX_WEEKLY_HOURS + ".");
        }
        String text = cleanNote(note, false);

        boolean commitmentChanged = weeklyHours == null
                ? enrollment.getWeeklyHoursCommitment() != null
                : !weeklyHours.equals(enrollment.getWeeklyHoursCommitment());
        enrollment.setCustomEndDate(endDate);
        enrollment.setWeeklyHoursCommitment(weeklyHours);
        if (commitmentChanged) enrollment.setCommitmentSince(weeklyHours != null ? today : null);
        enrollmentRepository.save(enrollment);

        String summary = planSummary(endDate, weeklyHours);
        RiskFollowUp followUp = openOrCreate(enrollment);
        saveAction(followUp, enrollmentId, professorId, "PLAN",
                text.isEmpty() ? summary : summary + " " + text, endDate);

        //el estudiante tiene que saber el plan que se acordo
        try {
            notificationClient.sendNotification(
                    enrollment.getStudentId(), group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                    "FOLLOW_UP_PLAN", "Plan de seguimiento", "Tu docente actualizó tu plan de práctica: " + summary,
                    "/resumen", group.getIdGroup());
        } catch (Exception e) {
            System.err.println("Error notificando el plan al estudiante: " + e.getMessage());
        }
        return toDTO(enrollment, evaluate(group, enrollment));
    }

    //se usa al eliminar un grupo
    public void deleteByEnrollment(Long enrollmentId) {
        actionRepository.deleteAll(actionRepository.findByEnrollmentId(enrollmentId));
        followUpRepository.deleteAll(followUpRepository.findByEnrollmentId(enrollmentId));
    }

    private String planSummary(LocalDate endDate, Double weeklyHours) {
        if (endDate == null && weeklyHours == null) return "Se quitó el plan; vuelve a regir la fecha del grupo.";
        StringBuilder text = new StringBuilder();
        if (endDate != null) text.append("Nueva fecha de término: ").append(endDate.format(DATE_FORMAT)).append(".");
        if (weeklyHours != null) {
            if (!text.isEmpty()) text.append(" ");
            text.append("Compromiso: ").append(formatHours(weeklyHours)).append(" h por semana.");
        }
        return text.toString();
    }

    private String formatHours(double value) {
        return value == Math.rint(value) ? String.valueOf((long) value) : String.valueOf(Math.round(value * 10.0) / 10.0);
    }

    private RiskDTO evaluate(PracticeGroup group, PracticeEnrollment enrollment) {
        return riskService.evaluate(group, enrollment, logRepository.findByIdEnrollment(enrollment.getEnrollmentId()));
    }

    //la alerta abierta, o una nueva si el docente actua sin que haya una
    private RiskFollowUp openOrCreate(PracticeEnrollment enrollment) {
        LocalDateTime now = LocalDateTime.now();
        RiskFollowUp followUp = followUpRepository
                .findFirstByEnrollmentIdAndStatusNotOrderByOpenedAtDesc(enrollment.getEnrollmentId(), RESOLVED)
                .orElseGet(() -> new RiskFollowUp(null, enrollment.getEnrollmentId(), IN_PROGRESS,
                        PracticeRiskService.NO_ALERT, now, now, null));
        followUp.setStatus(IN_PROGRESS);
        followUp.setUpdatedAt(now);
        return followUpRepository.save(followUp);
    }

    private void close(RiskFollowUp followUp, Long professorId, String note) {
        LocalDateTime now = LocalDateTime.now();
        followUp.setStatus(RESOLVED);
        followUp.setResolvedAt(now);
        followUp.setUpdatedAt(now);
        followUpRepository.save(followUp);
        saveAction(followUp, followUp.getEnrollmentId(), professorId, "CIERRE", note, null);
    }

    private void saveAction(RiskFollowUp followUp, Long enrollmentId, Long professorId, String type, String note, LocalDate commitmentDate) {
        actionRepository.save(new RiskFollowUpAction(null, followUp.getFollowUpId(), enrollmentId, professorId,
                type, note, commitmentDate, LocalDateTime.now()));
    }

    private FollowUpDTO toDTO(PracticeEnrollment enrollment, RiskDTO risk) {
        RiskFollowUp last = followUpRepository.findFirstByEnrollmentIdOrderByOpenedAtDesc(enrollment.getEnrollmentId()).orElse(null);
        List<RiskFollowUpAction> actions = actionRepository.findByEnrollmentIdOrderByCreatedAtDesc(enrollment.getEnrollmentId());
        return new FollowUpDTO(
                enrollment.getEnrollmentId(),
                last != null ? last.getStatus() : null,
                last != null ? last.getLevel() : null,
                last != null ? last.getOpenedAt() : null,
                last != null ? last.getResolvedAt() : null,
                risk.getLevel(),
                risk.getReasons(),
                risk.getRequiredWeeklyHours(),
                risk.getEndDate(),
                enrollment.getCustomEndDate(),
                enrollment.getWeeklyHoursCommitment(),
                enrollment.getCommitmentSince(),
                actions);
    }

    private String cleanNote(String note, boolean required) {
        String text = note == null ? "" : note.trim();
        if (required && text.isEmpty()) {
            throw new IllegalArgumentException("Describe brevemente lo que hiciste o acordaste.");
        }
        if (text.length() > MAX_NOTE_LENGTH) {
            throw new IllegalArgumentException("La nota no puede superar los " + MAX_NOTE_LENGTH + " caracteres.");
        }
        return text;
    }

    private PracticeEnrollment findEnrollment(Long enrollmentId) {
        return enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new IllegalArgumentException("La vinculación no existe."));
    }

    private PracticeGroup ownedGroup(PracticeEnrollment enrollment, Long professorId) {
        PracticeGroup group = groupRepository.findById(enrollment.getPracticeGroupId())
                .orElseThrow(() -> new IllegalArgumentException("Grupo de práctica no encontrado."));
        if (!group.getIdProfessor().equals(professorId)) {
            throw new SecurityException("ACCESO DENEGADO: No eres el profesor de este grupo.");
        }
        return group;
    }

    private PracticeGroup activeOwnedGroup(PracticeEnrollment enrollment, Long professorId) {
        PracticeGroup group = ownedGroup(enrollment, professorId);
        if (!"Activo".equalsIgnoreCase(group.getStatus())) {
            throw new IllegalStateException("ACCION DENEGADA: El grupo está Inactivo y se encuentra en modo de solo lectura.");
        }
        return group;
    }
}
