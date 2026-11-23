package com.top.practice_service.services;

import com.top.practice_service.DTO.EmailRequestDTO;
import com.top.practice_service.DTO.SupervisorDTO;
import com.top.practice_service.DTO.SupervisorLinkDTO;
import com.top.practice_service.DTO.SupervisorLogDTO;
import com.top.practice_service.DTO.SupervisorViewDTO;
import com.top.practice_service.DTO.UserDTO;
import com.top.practice_service.clients.AuthClient;
import com.top.practice_service.clients.NotificationClient;
import com.top.practice_service.exceptions.InvalidLinkException;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.models.PracticeLog;
import com.top.practice_service.models.SupervisorAccessToken;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import com.top.practice_service.repositories.PracticeLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class SupervisorService {
    public static final String PENDING = "PENDIENTE";
    public static final String VALIDATED = "VALIDADA";
    public static final String OBSERVED = "OBSERVADA";

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");
    private static final int COMMENT_MIN = 5;
    private static final int COMMENT_MAX = 500;
    private static final int MAX_ITEMS = 200;
    private static final int RESEND_DAYS = 6;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;
    @Autowired
    private PracticeGroupRepository groupRepository;
    @Autowired
    private PracticeLogRepository logRepository;
    @Autowired
    private SupervisorLinkService linkService;
    @Autowired
    private NotificationClient notificationClient;
    @Autowired
    private AuthClient authClient;

    //estudiante de la vinculacion o docente del grupo
    public SupervisorDTO getSupervisor(Long enrollmentId, Long userId, String role) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        checkAccess(enrollment, findGroup(enrollment), userId, role);
        return toDTO(enrollment);
    }

    public SupervisorDTO updateSupervisor(Long enrollmentId, Long userId, String role,
                                          String name, String position, String email, String company) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        PracticeGroup group = findGroup(enrollment);
        String actor = checkAccess(enrollment, group, userId, role);
        checkActive(group);

        String cleanName = required(name, "el nombre del supervisor", 3, 120);
        String cleanPosition = required(position, "el cargo del supervisor", 2, 100);
        String cleanCompany = required(company, "la empresa o institución", 2, 150);
        String cleanEmail = required(email, "el correo del supervisor", 6, 150).toLowerCase();
        if (!EMAIL.matcher(cleanEmail).matches()) {
            throw new IllegalArgumentException("El correo del supervisor no es válido.");
        }
        //el supervisor no puede ser el mismo estudiante ni el docente del curso
        if (cleanEmail.equalsIgnoreCase(emailOf(enrollment.getStudentId()))
                || cleanEmail.equalsIgnoreCase(emailOf(group.getIdProfessor()))) {
            throw new IllegalArgumentException("El supervisor debe ser una persona del centro de práctica, no el estudiante ni el docente.");
        }

        boolean emailChanged = enrollment.getSupervisorEmail() != null
                && !enrollment.getSupervisorEmail().equalsIgnoreCase(cleanEmail);
        if (emailChanged) linkService.revokeAll(enrollmentId);

        enrollment.setSupervisorName(cleanName);
        enrollment.setSupervisorPosition(cleanPosition);
        enrollment.setSupervisorCompany(cleanCompany);
        enrollment.setSupervisorEmail(cleanEmail);
        if (emailChanged) enrollment.setSupervisorLastEmailAt(null);
        enrollmentRepository.save(enrollment);

        //si lo cambia el estudiante, el docente se entera
        if ("ESTUDIANTE".equals(actor)) {
            notify(group.getIdProfessor(), group, "SUPERVISOR_UPDATED", "Supervisor actualizado",
                    nameOr(enrollment.getStudentId(), "Un estudiante") + " registró como supervisor a "
                            + cleanName + " (" + cleanCompany + ").", enrollmentId);
        }
        return toDTO(enrollment);
    }

    //docente - enlace para copiarlo y enviarlo por otro medio (WhatsApp, su correo)
    public SupervisorLinkDTO createLink(Long enrollmentId, Long professorId) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        PracticeGroup group = findGroup(enrollment);
        checkProfessor(group, professorId);
        checkActive(group);
        checkHasSupervisor(enrollment);
        String token = linkService.issue(enrollment, SupervisorLinkService.VALIDATION);
        return new SupervisorLinkDTO(linkService.urlFor(token), linkService.expiresAt());
    }

    //docente - envia ahora el correo de validacion
    public SupervisorDTO sendNow(Long enrollmentId, Long professorId) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        PracticeGroup group = findGroup(enrollment);
        checkProfessor(group, professorId);
        checkActive(group);
        checkHasSupervisor(enrollment);
        sendValidationEmail(enrollment, group);
        return toDTO(enrollment);
    }

    //cada lunes 9:30 - a cada supervisor con jornadas pendientes le llega su enlace
    @Scheduled(cron = "0 30 9 * * MON", zone = "America/Santiago")
    public void weeklyValidationEmails() {
        LocalDateTime limit = LocalDateTime.now().minusDays(RESEND_DAYS);
        for (PracticeGroup group : groupRepository.findAll()) {
            if (!"Activo".equalsIgnoreCase(group.getStatus())) continue;
            for (PracticeEnrollment enrollment : enrollmentRepository.findByPracticeGroupId(group.getIdGroup())) {
                if (enrollment.getSupervisorEmail() == null) continue;
                if (enrollment.getSupervisorLastEmailAt() != null && enrollment.getSupervisorLastEmailAt().isAfter(limit)) continue;
                if (countByStatus(logsOf(enrollment), PENDING) == 0) continue;
                try {
                    sendValidationEmail(enrollment, group);
                } catch (Exception e) {
                    System.err.println("No se pudo enviar el correo al supervisor de la vinculación "
                            + enrollment.getEnrollmentId() + ": " + e.getMessage());
                }
            }
        }
    }

//enlace publico del supervisor
    public SupervisorViewDTO publicView(String token) {
        PracticeEnrollment enrollment = enrollmentFor(token);
        return toView(enrollment, findGroup(enrollment), token);
    }

    //valida y observa jornadas en una sola llamada
    public SupervisorViewDTO publicReview(String token, List<Long> validateIds, Map<Long, String> observations) {
        PracticeEnrollment enrollment = enrollmentFor(token);
        PracticeGroup group = findGroup(enrollment);
        if (!"Activo".equalsIgnoreCase(group.getStatus())) {
            throw new IllegalStateException("La práctica ya está cerrada: puedes ver las jornadas, pero no modificarlas.");
        }

        List<Long> toValidate = validateIds == null ? List.of() : validateIds;
        Map<Long, String> toObserve = observations == null ? Map.of() : observations;
        if (toValidate.isEmpty() && toObserve.isEmpty()) {
            throw new IllegalArgumentException("Selecciona al menos una jornada para validar u observar.");
        }
        if (toValidate.size() + toObserve.size() > MAX_ITEMS) {
            throw new IllegalArgumentException("Son demasiadas jornadas en una sola vez.");
        }
        Set<Long> repeated = new HashSet<>(toValidate);
        repeated.retainAll(toObserve.keySet());
        if (!repeated.isEmpty()) {
            throw new IllegalArgumentException("Una jornada no puede quedar validada y observada a la vez.");
        }

        List<PracticeLog> logs = logsOf(enrollment);
        LocalDateTime now = LocalDateTime.now();
        List<PracticeLog> changed = new ArrayList<>();
        for (Long logId : toValidate) {
            PracticeLog log = logOf(logs, logId);
            log.setSupervisorStatus(VALIDATED);
            log.setSupervisorComment(null);
            log.setSupervisorReviewedAt(now);
            changed.add(log);
        }
        List<PracticeLog> observed = new ArrayList<>();
        for (Map.Entry<Long, String> entry : toObserve.entrySet()) {
            PracticeLog log = logOf(logs, entry.getKey());
            String comment = entry.getValue() == null ? "" : entry.getValue().trim();
            if (comment.length() < COMMENT_MIN || comment.length() > COMMENT_MAX) {
                throw new IllegalArgumentException("Cada observación debe tener entre " + COMMENT_MIN + " y "
                        + COMMENT_MAX + " caracteres (jornada del " + log.getLogDate().format(DATE_FORMAT) + ").");
            }
            log.setSupervisorStatus(OBSERVED);
            log.setSupervisorComment(comment);
            log.setSupervisorReviewedAt(now);
            changed.add(log);
            observed.add(log);
        }
        logRepository.saveAll(changed);

        //las observaciones le llegan al docente y al estudiante
        if (!observed.isEmpty()) {
            String student = nameOr(enrollment.getStudentId(), "un estudiante");
            String detail = observed.size() == 1
                    ? "la jornada del " + observed.get(0).getLogDate().format(DATE_FORMAT)
                    : observed.size() + " jornadas";
            notify(group.getIdProfessor(), group, "SUPERVISOR_OBSERVATION", "Observación del supervisor",
                    "El supervisor de " + student + " observó " + detail + ".", enrollment.getEnrollmentId());
            notify(enrollment.getStudentId(), group, "SUPERVISOR_OBSERVATION", "Observación del supervisor",
                    "Tu supervisor observó " + detail + ". Revisa el comentario en tus jornadas.", enrollment.getEnrollmentId());
        }
        return toView(enrollment, group, token);
    }

    //se usa al eliminar un grupo
    public void deleteByEnrollment(Long enrollmentId) {
        linkService.deleteByEnrollment(enrollmentId);
    }

//internos

    private void sendValidationEmail(PracticeEnrollment enrollment, PracticeGroup group) {
        long pending = countByStatus(logsOf(enrollment), PENDING);
        String token = linkService.issue(enrollment, SupervisorLinkService.VALIDATION);
        String student = nameOr(enrollment.getStudentId(), "Tu estudiante en práctica");
        String expires = linkService.expiresAt().format(DATE_FORMAT);

        List<String> paragraphs = new ArrayList<>();
        paragraphs.add("Hola " + enrollment.getSupervisorName() + ":");
        paragraphs.add(pending == 0
                ? student + " no tiene jornadas pendientes por ahora, pero puedes revisar las que ya registró en "
                        + enrollment.getSupervisorCompany() + "."
                : student + " registró " + pending + (pending == 1 ? " jornada" : " jornadas") + " de práctica en "
                        + enrollment.getSupervisorCompany() + " que esperan tu validación.");
        paragraphs.add("Desde el enlace puedes validarlas o dejar una observación. No necesitas crear una cuenta.");
        paragraphs.add("El enlace es personal y vence el " + expires + ".");

        try {
            notificationClient.sendEmail(new EmailRequestDTO(
                    enrollment.getSupervisorEmail(), enrollment.getSupervisorName(),
                    "PrácticasHub – Validación de jornadas de " + student,
                    "Validación de jornadas de práctica",
                    paragraphs,
                    linkService.urlFor(token), "Revisar jornadas",
                    "Este correo lo envió PrácticasHub por la práctica del curso " + group.getCourseName()
                            + ". Si no corresponde, puedes ignorarlo."));
        } catch (Exception e) {
            System.err.println("Error enviando el correo al supervisor: " + e.getMessage());
            throw new IllegalStateException("No se pudo enviar el correo. Copia el enlace y envíalo por otro medio.");
        }

        enrollment.setSupervisorLastEmailAt(LocalDateTime.now());
        enrollmentRepository.save(enrollment);
    }

    private PracticeEnrollment enrollmentFor(String token) {
        SupervisorAccessToken access = linkService.find(token, SupervisorLinkService.VALIDATION);
        PracticeEnrollment enrollment = enrollmentRepository.findById(access.getEnrollmentId())
                .orElseThrow(InvalidLinkException::new);
        linkService.resolve(token, SupervisorLinkService.VALIDATION, enrollment);
        return enrollment;
    }

    private SupervisorViewDTO toView(PracticeEnrollment enrollment, PracticeGroup group, String token) {
        List<PracticeLog> logs = logsOf(enrollment);
        List<SupervisorLogDTO> items = logs.stream()
                .sorted(Comparator.comparing(PracticeLog::getLogDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(log -> new SupervisorLogDTO(log.getLogId(), log.getLogDate(), log.getStartTime(), log.getEndTime(),
                        log.getBreakMinutes(), log.getTotalHours(), log.getMainActivity(), log.getActivitiesDescription(),
                        statusOf(log), log.getSupervisorComment(), log.getSupervisorReviewedAt()))
                .toList();
        return new SupervisorViewDTO(
                nameOr(enrollment.getStudentId(), "Estudiante"),
                group.getCourseName(),
                enrollment.getSupervisorCompany(),
                enrollment.getSupervisorName(),
                linkService.find(token, SupervisorLinkService.VALIDATION).getExpiresAt(),
                !"Activo".equalsIgnoreCase(group.getStatus()),
                group.getMinimumHours(),
                hours(logs, null),
                hours(logs, VALIDATED),
                items);
    }

    private SupervisorDTO toDTO(PracticeEnrollment enrollment) {
        List<PracticeLog> logs = logsOf(enrollment);
        return new SupervisorDTO(enrollment.getEnrollmentId(), enrollment.getSupervisorName(),
                enrollment.getSupervisorPosition(), enrollment.getSupervisorEmail(), enrollment.getSupervisorCompany(),
                enrollment.getSupervisorLastEmailAt(),
                countByStatus(logs, PENDING), countByStatus(logs, VALIDATED), countByStatus(logs, OBSERVED),
                hours(logs, VALIDATED), hours(logs, null));
    }

    private List<PracticeLog> logsOf(PracticeEnrollment enrollment) {
        return logRepository.findByIdEnrollment(enrollment.getEnrollmentId());
    }

    private PracticeLog logOf(List<PracticeLog> logs, Long logId) {
        return logs.stream().filter(log -> log.getLogId().equals(logId)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Una de las jornadas no pertenece a este estudiante."));
    }

    //jornadas antiguas sin estado cuentan como pendientes
    private static String statusOf(PracticeLog log) {
        return log.getSupervisorStatus() == null ? PENDING : log.getSupervisorStatus();
    }

    private static long countByStatus(List<PracticeLog> logs, String status) {
        return logs.stream().filter(log -> status.equals(statusOf(log))).count();
    }

    //status null = todas las horas
    private static double hours(List<PracticeLog> logs, String status) {
        double total = logs.stream()
                .filter(log -> status == null || status.equals(statusOf(log)))
                .mapToDouble(log -> log.getTotalHours() == null ? 0 : log.getTotalHours())
                .sum();
        return Math.round(total * 100.0) / 100.0;
    }

    //devuelve el rol con que actua
    private String checkAccess(PracticeEnrollment enrollment, PracticeGroup group, Long userId, String role) {
        if ("ESTUDIANTE".equalsIgnoreCase(role) && enrollment.getStudentId().equals(userId)) return "ESTUDIANTE";
        if ("PROFESOR".equalsIgnoreCase(role) && group.getIdProfessor().equals(userId)) return "PROFESOR";
        throw new SecurityException("ACCESO DENEGADO: No tienes acceso a esta práctica.");
    }

    private void checkProfessor(PracticeGroup group, Long professorId) {
        if (!group.getIdProfessor().equals(professorId)) {
            throw new SecurityException("ACCESO DENEGADO: No eres el profesor de este grupo.");
        }
    }

    private void checkActive(PracticeGroup group) {
        if (!"Activo".equalsIgnoreCase(group.getStatus())) {
            throw new IllegalStateException("ACCION DENEGADA: El grupo está Inactivo y se encuentra en modo de solo lectura.");
        }
    }

    private void checkHasSupervisor(PracticeEnrollment enrollment) {
        if (enrollment.getSupervisorEmail() == null) {
            throw new IllegalStateException("El estudiante todavía no registra a su supervisor.");
        }
    }

    private static String required(String value, String label, int min, int max) {
        String clean = value == null ? "" : value.trim();
        if (clean.length() < min) throw new IllegalArgumentException("Falta " + label + ".");
        if (clean.length() > max) {
            throw new IllegalArgumentException("El campo " + label + " no puede superar los " + max + " caracteres.");
        }
        return clean;
    }

    private void notify(Long userId, PracticeGroup group, String type, String title, String message, Long enrollmentId) {
        try {
            notificationClient.sendNotification(userId, group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                    type, title, message, null, enrollmentId);
        } catch (Exception e) {
            System.err.println("Error enviando la notificación " + type + ": " + e.getMessage());
        }
    }

    private String emailOf(Long userId) {
        try {
            UserDTO user = authClient.getUserById(userId);
            return user == null ? null : user.getEmail();
        } catch (Exception e) {
            return null;
        }
    }

    private String nameOr(Long userId, String fallback) {
        try {
            String name = authClient.getUserById(userId).getName();
            return name == null || name.isBlank() ? fallback : name;
        } catch (Exception e) {
            return fallback;
        }
    }

    private PracticeEnrollment findEnrollment(Long enrollmentId) {
        return enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new IllegalArgumentException("La vinculación no existe."));
    }

    private PracticeGroup findGroup(PracticeEnrollment enrollment) {
        return groupRepository.findById(enrollment.getPracticeGroupId())
                .orElseThrow(() -> new IllegalArgumentException("Grupo de práctica no encontrado."));
    }
}
