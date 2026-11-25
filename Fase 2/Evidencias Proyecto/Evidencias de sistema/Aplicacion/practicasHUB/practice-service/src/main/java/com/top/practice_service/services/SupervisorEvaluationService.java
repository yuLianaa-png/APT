package com.top.practice_service.services;

import com.top.practice_service.DTO.ActivityAnswerDTO;
import com.top.practice_service.DTO.EmailRequestDTO;
import com.top.practice_service.DTO.EvaluationAnswersDTO;
import com.top.practice_service.DTO.EvaluationResultsDTO;
import com.top.practice_service.DTO.EvaluationTemplateDTO;
import com.top.practice_service.DTO.ItemAnswerDTO;
import com.top.practice_service.DTO.PublicEvaluationViewDTO;
import com.top.practice_service.DTO.SectionAnswersDTO;
import com.top.practice_service.DTO.SupervisorEvaluationDTO;
import com.top.practice_service.DTO.SupervisorLinkDTO;
import com.top.practice_service.DTO.TemplateItemDTO;
import com.top.practice_service.DTO.TemplateSectionDTO;
import com.top.practice_service.clients.AuthClient;
import com.top.practice_service.clients.NotificationClient;
import com.top.practice_service.exceptions.InvalidLinkException;
import com.top.practice_service.models.EvaluationAnswer;
import com.top.practice_service.models.EvaluationTemplate;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.models.PracticeLog;
import com.top.practice_service.models.SupervisorAccessToken;
import com.top.practice_service.models.SupervisorEvaluation;
import com.top.practice_service.repositories.EvaluationAnswerRepository;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import com.top.practice_service.repositories.PracticeLogRepository;
import com.top.practice_service.repositories.SupervisorEvaluationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class SupervisorEvaluationService {
    public static final String WAITING_TEMPLATE = "ESPERANDO_PAUTA";
    public static final String SENT = "ENVIADA";
    public static final String ANSWERED = "RESPONDIDA";
    public static final String NOT_SENT = "SIN_ENVIAR";

    private static final int REMINDER_DAYS = 5;
    private static final int MAX_REMINDERS = 2;
    private static final int MIN_DESCRIPTION = 3;
    private static final int MAX_DESCRIPTION = 300;
    private static final int MAX_TEXT = 2000;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Autowired
    private SupervisorEvaluationRepository evaluationRepository;
    @Autowired
    private EvaluationAnswerRepository answerRepository;
    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;
    @Autowired
    private PracticeGroupRepository groupRepository;
    @Autowired
    private PracticeLogRepository logRepository;
    @Autowired
    private EvaluationTemplateService templateService;
    @Autowired
    private SupervisorLinkService linkService;
    @Autowired
    private NotificationClient notificationClient;
    @Autowired
    private AuthClient authClient;
    @Autowired
    private PlatformTransactionManager transactionManager;

//envio automatico
    //lunes a viernes 9:45 (despues del ping que despierta el servicio): hitos alcanzados y recordatorios
    @Scheduled(cron = "0 45 9 * * MON-FRI", zone = "America/Santiago")
    public void dailyEvaluations() {
        for (PracticeGroup group : groupRepository.findAll()) {
            try {
                dispatchGroup(group.getIdGroup());
            } catch (Exception e) {
                System.err.println("Error revisando las evaluaciones del grupo " + group.getIdGroup() + ": " + e.getMessage());
            }
        }
        sendReminders();
    }

    //envia lo que corresponda en un grupo; se llama tambien al publicar una pauta
    public void dispatchGroup(Long groupId) {
        PracticeGroup group = groupRepository.findById(groupId).orElse(null);
        if (group == null || !"Activo".equalsIgnoreCase(group.getStatus())) return;
        List<EvaluationTemplateService.Milestone> milestones = templateService.milestonesFor(group.getEvaluationMode());
        if (milestones.isEmpty() || group.getMinimumHours() == null || group.getMinimumHours() <= 0) return;

        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        int newlyWaiting = 0;
        for (PracticeEnrollment enrollment : enrollmentRepository.findByPracticeGroupId(groupId)) {
            double hours = hoursOf(enrollment);
            for (EvaluationTemplateService.Milestone milestone : milestones) {
                if (hours < group.getMinimumHours() * milestone.share()) continue;
                try {
                    Boolean waiting = tx.execute(status -> reachMilestone(group, enrollment, milestone));
                    if (Boolean.TRUE.equals(waiting)) newlyWaiting++;
                } catch (Exception e) {
                    System.err.println("No se pudo enviar la evaluación de la vinculación "
                            + enrollment.getEnrollmentId() + ": " + e.getMessage());
                }
            }
        }
        if (newlyWaiting > 0) {
            notify(group.getIdProfessor(), group, "EVALUATION_WAITING_TEMPLATE", "Evaluación sin pauta",
                    newlyWaiting == 1
                            ? "Un estudiante llegó al momento de su evaluación, pero falta publicar la pauta."
                            : newlyWaiting + " estudiantes llegaron al momento de su evaluación, pero falta publicar la pauta.",
                    groupId);
        }
    }

    //true si quedo esperando la pauta por primera vez
    private Boolean reachMilestone(PracticeGroup group, PracticeEnrollment enrollment, EvaluationTemplateService.Milestone milestone) {
        SupervisorEvaluation evaluation = evaluationRepository
                .findByEnrollmentIdAndMilestone(enrollment.getEnrollmentId(), milestone.name()).orElse(null);
        if (evaluation != null && !WAITING_TEMPLATE.equals(evaluation.getStatus())) return false;
        boolean isNew = evaluation == null;
        if (isNew) evaluation = newEvaluation(group, enrollment, milestone);

        EvaluationTemplate template = templateService.findPublished(group.getIdGroup(), milestone.slot()).orElse(null);
        if (template == null || enrollment.getSupervisorEmail() == null) {
            evaluation.setStatus(WAITING_TEMPLATE);
            evaluationRepository.save(evaluation);
            return isNew && template == null;
        }
        send(group, enrollment, evaluation, template, milestone.label(), false);
        return false;
    }

    private void sendReminders() {
        LocalDateTime limit = LocalDateTime.now().minusDays(REMINDER_DAYS);
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        for (SupervisorEvaluation evaluation : evaluationRepository.findByStatus(SENT)) {
            LocalDateTime last = evaluation.getLastReminderAt() != null ? evaluation.getLastReminderAt() : evaluation.getSentAt();
            if (evaluation.getReminderCount() >= MAX_REMINDERS || last == null || last.isAfter(limit)) continue;
            try {
                tx.executeWithoutResult(status -> {
                    PracticeEnrollment enrollment = enrollmentRepository.findById(evaluation.getEnrollmentId()).orElse(null);
                    PracticeGroup group = groupRepository.findById(evaluation.getGroupId()).orElse(null);
                    if (enrollment == null || group == null || enrollment.getSupervisorEmail() == null
                            || !"Activo".equalsIgnoreCase(group.getStatus())) return;
                    EvaluationTemplate template = templateService.findById(evaluation.getTemplateId()).orElse(null);
                    if (template == null) return;
                    send(group, enrollment, evaluation, template, labelOf(group, evaluation.getMilestone()), true);
                });
            } catch (Exception e) {
                System.err.println("No se pudo enviar el recordatorio de la evaluación " + evaluation.getEvaluationId() + ": " + e.getMessage());
            }
        }
    }

//acciones del docente
    @Transactional(readOnly = true)
    public List<SupervisorEvaluationDTO> listForEnrollment(Long enrollmentId, Long userId, String role) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        PracticeGroup group = findGroup(enrollment);
        boolean professor = "PROFESOR".equalsIgnoreCase(role) && group.getIdProfessor().equals(userId);
        boolean student = "ESTUDIANTE".equalsIgnoreCase(role) && enrollment.getStudentId().equals(userId);
        if (!professor && !student) throw new SecurityException("ACCESO DENEGADO: No tienes acceso a esta práctica.");

        List<SupervisorEvaluationDTO> result = new ArrayList<>();
        double hours = hoursOf(enrollment);
        for (EvaluationTemplateService.Milestone milestone : templateService.milestonesFor(group.getEvaluationMode())) {
            SupervisorEvaluation evaluation = evaluationRepository
                    .findByEnrollmentIdAndMilestone(enrollmentId, milestone.name()).orElse(null);
            //el estudiante solo ve lo que el docente publico
            if (student && (evaluation == null || !evaluation.isPublishedToStudent())) continue;
            Double required = group.getMinimumHours() == null ? null : group.getMinimumHours() * milestone.share();
            result.add(toDTO(evaluation, milestone, required, required != null && hours >= required));
        }
        return result;
    }

    //envia ahora (o reenvia) el correo con la evaluacion de un hito
    @Transactional
    public SupervisorEvaluationDTO sendNow(Long enrollmentId, String milestoneName, Long professorId) {
        Prepared p = prepare(enrollmentId, milestoneName, professorId);
        send(p.group, p.enrollment, p.evaluation, p.template, p.milestone.label(), false);
        return toDTO(p.evaluation, p.milestone, null, null);
    }

    //enlace para enviarlo por otro medio (no manda correo)
    @Transactional
    public SupervisorLinkDTO createLink(Long enrollmentId, String milestoneName, Long professorId) {
        Prepared p = prepare(enrollmentId, milestoneName, professorId);
        markSent(p.evaluation, p.template, p.enrollment);
        String token = linkService.issue(p.enrollment, SupervisorLinkService.EVALUATION, p.evaluation.getEvaluationId());
        return new SupervisorLinkDTO(linkService.evaluationUrlFor(token), linkService.expiresAt());
    }

    @Transactional
    public SupervisorEvaluationDTO publishToStudent(Long enrollmentId, String milestoneName, Long professorId) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        PracticeGroup group = findGroup(enrollment);
        checkProfessor(group, professorId);
        EvaluationTemplateService.Milestone milestone = milestoneOf(group, milestoneName);
        SupervisorEvaluation evaluation = evaluationRepository.findByEnrollmentIdAndMilestone(enrollmentId, milestone.name())
                .filter(e -> ANSWERED.equals(e.getStatus()))
                .orElseThrow(() -> new IllegalStateException("El supervisor todavía no responde esta evaluación."));
        publish(group, enrollment, evaluation, milestone.label());
        return toDTO(evaluation, milestone, null, null);
    }

    //publica todas las respondidas del grupo en un hito
    @Transactional
    public List<EvaluationResultsDTO> publishGroup(Long groupId, String milestoneName, Long professorId) {
        PracticeGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Grupo de práctica no encontrado."));
        checkProfessor(group, professorId);
        EvaluationTemplateService.Milestone milestone = milestoneOf(group, milestoneName);
        for (SupervisorEvaluation evaluation : evaluationRepository.findByGroupId(groupId)) {
            if (!milestone.name().equals(evaluation.getMilestone()) || !ANSWERED.equals(evaluation.getStatus())
                    || evaluation.isPublishedToStudent()) continue;
            enrollmentRepository.findById(evaluation.getEnrollmentId())
                    .ifPresent(enrollment -> publish(group, enrollment, evaluation, milestone.label()));
        }
        return results(groupId, professorId);
    }

    @Transactional(readOnly = true)
    public List<EvaluationResultsDTO> results(Long groupId, Long professorId) {
        PracticeGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Grupo de práctica no encontrado."));
        checkProfessor(group, professorId);
        List<SupervisorEvaluation> evaluations = evaluationRepository.findByGroupId(groupId);
        List<EvaluationResultsDTO> result = new ArrayList<>();
        for (EvaluationTemplateService.Milestone milestone : templateService.milestonesFor(group.getEvaluationMode())) {
            List<SupervisorEvaluation> mine = evaluations.stream().filter(e -> milestone.name().equals(e.getMilestone())).toList();
            result.add(new EvaluationResultsDTO(milestone.name(), milestone.label(),
                    mine.stream().filter(e -> WAITING_TEMPLATE.equals(e.getStatus())).count(),
                    mine.stream().filter(e -> SENT.equals(e.getStatus())).count(),
                    mine.stream().filter(e -> ANSWERED.equals(e.getStatus())).count(),
                    mine.stream().filter(SupervisorEvaluation::isPublishedToStudent).count()));
        }
        return result;
    }

    //se usa al eliminar un grupo
    @Transactional
    public void deleteByEnrollment(Long enrollmentId) {
        for (SupervisorEvaluation evaluation : evaluationRepository.findByEnrollmentId(enrollmentId)) {
            answerRepository.deleteAll(answerRepository.findByEvaluationId(evaluation.getEvaluationId()));
            evaluationRepository.delete(evaluation);
        }
    }

//enlace publico del supervisor
    @Transactional
    public PublicEvaluationViewDTO publicView(String token) {
        Access a = access(token);
        boolean submitted = ANSWERED.equals(a.evaluation.getStatus());
        return new PublicEvaluationViewDTO(
                nameOr(a.enrollment.getStudentId(), "Estudiante"),
                a.group.getCourseName(),
                a.enrollment.getSupervisorCompany(),
                a.enrollment.getSupervisorName(),
                labelOf(a.group, a.evaluation.getMilestone()),
                a.token.getExpiresAt(),
                submitted,
                a.evaluation.getSubmittedAt(),
                !"Activo".equalsIgnoreCase(a.group.getStatus()),
                //ya enviada: no se vuelve a mostrar el formulario
                submitted ? null : templateService.toDTO(a.template));
    }

    @Transactional
    public PublicEvaluationViewDTO submit(String token, EvaluationAnswersDTO answers) {
        Access a = access(token);
        if (ANSWERED.equals(a.evaluation.getStatus())) {
            throw new IllegalStateException("Esta evaluación ya fue enviada. Si necesitas corregirla, escríbele al docente del curso.");
        }
        if (!"Activo".equalsIgnoreCase(a.group.getStatus())) {
            throw new IllegalStateException("La práctica ya está cerrada: no se pueden enviar evaluaciones.");
        }
        List<TemplateSectionDTO> sections = templateService.toDTO(a.template).getSections();
        validate(sections, answers);

        List<EvaluationAnswer> rows = new ArrayList<>();
        for (int s = 0; s < sections.size(); s++) {
            List<TemplateItemDTO> items = sections.get(s).getItems();
            for (int i = 0; i < items.size(); i++) {
                TemplateItemDTO item = items.get(i);
                ItemAnswerDTO answer = EvaluationGradeCalculator.answer(answers, s, i);
                switch (item.getType()) {
                    case EvaluationTemplateService.SCORE -> rows.add(row(a, s, i, null,
                            Boolean.TRUE.equals(answer.getNotApplicable()) ? null : answer.getGrade(),
                            Boolean.TRUE.equals(answer.getNotApplicable()), null));
                    case EvaluationTemplateService.CALCULATED -> {
                        Double value = EvaluationGradeCalculator.scoreAverage(sections, answers, item.getSourceSection());
                        rows.add(row(a, s, i, null, value == null ? null : EvaluationGradeCalculator.round(value), false, null));
                    }
                    case EvaluationTemplateService.ACTIVITIES -> {
                        List<ActivityAnswerDTO> activities = answer.getActivities();
                        for (int k = 0; k < activities.size(); k++) {
                            rows.add(row(a, s, i, k, activities.get(k).getGrade(), false, activities.get(k).getDescription().trim()));
                        }
                    }
                    case EvaluationTemplateService.TEXT -> rows.add(row(a, s, i, null, null, false, answer.getText().trim()));
                    default -> { }
                }
            }
        }
        answerRepository.saveAll(rows);

        a.evaluation.setStatus(ANSWERED);
        a.evaluation.setSubmittedAt(LocalDateTime.now());
        a.evaluation.setFinalGrade(EvaluationGradeCalculator.finalGrade(sections, answers));
        a.evaluation.setSupervisorName(a.enrollment.getSupervisorName());
        a.evaluation.setSupervisorEmail(a.enrollment.getSupervisorEmail());
        evaluationRepository.save(a.evaluation);

        notify(a.group.getIdProfessor(), a.group, "EVALUATION_SUBMITTED", "Evaluación del supervisor recibida",
                "El supervisor de " + nameOr(a.enrollment.getStudentId(), "un estudiante") + " envió la "
                        + labelOf(a.group, a.evaluation.getMilestone()).toLowerCase() + ". Revísala y publícala cuando quieras.",
                a.enrollment.getEnrollmentId());
        return publicView(token);
    }

    //todo lleno: notas de 1 a 7 (o No aplica donde se permite), actividades completas y textos escritos
    private void validate(List<TemplateSectionDTO> sections, EvaluationAnswersDTO answers) {
        if (answers == null || answers.getSections() == null || answers.getSections().size() != sections.size()) {
            throw new IllegalArgumentException("La evaluación está incompleta.");
        }
        for (int s = 0; s < sections.size(); s++) {
            List<TemplateItemDTO> items = sections.get(s).getItems();
            SectionAnswersDTO section = answers.getSections().get(s);
            if (section == null || section.getItems() == null || section.getItems().size() != items.size()) {
                throw new IllegalArgumentException("La evaluación está incompleta.");
            }
            String where = " en «" + sections.get(s).getTitle() + "»";
            for (int i = 0; i < items.size(); i++) {
                TemplateItemDTO item = items.get(i);
                ItemAnswerDTO answer = section.getItems().get(i);
                if (answer == null) throw new IllegalArgumentException("Falta responder un criterio" + where + ".");
                switch (item.getType()) {
                    case EvaluationTemplateService.SCORE -> {
                        if (Boolean.TRUE.equals(answer.getNotApplicable())) {
                            if (!Boolean.TRUE.equals(item.getAllowNotApplicable())) {
                                throw new IllegalArgumentException("Un criterio" + where + " no admite «No aplica».");
                            }
                        } else if (!validGrade(answer.getGrade())) {
                            throw new IllegalArgumentException("Falta la nota de un criterio" + where + ".");
                        }
                    }
                    case EvaluationTemplateService.ACTIVITIES -> {
                        List<ActivityAnswerDTO> activities = answer.getActivities() == null ? List.of() : answer.getActivities();
                        int min = item.getMinActivities() == null ? 1 : item.getMinActivities();
                        if (activities.size() < min) {
                            throw new IllegalArgumentException("Escribe al menos " + min + (min == 1 ? " actividad" : " actividades") + where + ".");
                        }
                        if (activities.size() > EvaluationTemplateService.MAX_ACTIVITIES) {
                            throw new IllegalArgumentException("Puedes escribir como máximo " + EvaluationTemplateService.MAX_ACTIVITIES + " actividades.");
                        }
                        for (ActivityAnswerDTO activity : activities) {
                            String text = activity == null || activity.getDescription() == null ? "" : activity.getDescription().trim();
                            if (text.length() < MIN_DESCRIPTION || text.length() > MAX_DESCRIPTION) {
                                throw new IllegalArgumentException("Cada actividad debe tener una descripción de "
                                        + MIN_DESCRIPTION + " a " + MAX_DESCRIPTION + " caracteres" + where + ".");
                            }
                            if (!validGrade(activity.getGrade())) throw new IllegalArgumentException("Falta la nota de una actividad" + where + ".");
                        }
                    }
                    case EvaluationTemplateService.TEXT -> {
                        String text = answer.getText() == null ? "" : answer.getText().trim();
                        if (text.isEmpty()) throw new IllegalArgumentException("Falta responder «" + item.getLabel() + "».");
                        if (text.length() > MAX_TEXT) {
                            throw new IllegalArgumentException("Cada respuesta puede tener como máximo " + MAX_TEXT + " caracteres.");
                        }
                    }
                    default -> { }
                }
            }
        }
    }

    private static boolean validGrade(Double grade) {
        return grade != null && grade >= 1 && grade <= 7 && grade == Math.floor(grade);
    }

//internos
    private record Prepared(PracticeGroup group, PracticeEnrollment enrollment, SupervisorEvaluation evaluation,
                            EvaluationTemplate template, EvaluationTemplateService.Milestone milestone) { }

    private record Access(SupervisorAccessToken token, PracticeEnrollment enrollment, PracticeGroup group,
                          SupervisorEvaluation evaluation, EvaluationTemplate template) { }

    //lo comun de enviar ahora y copiar enlace
    private Prepared prepare(Long enrollmentId, String milestoneName, Long professorId) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        PracticeGroup group = findGroup(enrollment);
        checkProfessor(group, professorId);
        if (!"Activo".equalsIgnoreCase(group.getStatus())) {
            throw new IllegalStateException("ACCION DENEGADA: El grupo está Inactivo y se encuentra en modo de solo lectura.");
        }
        if (enrollment.getSupervisorEmail() == null) {
            throw new IllegalStateException("El estudiante todavía no registra a su supervisor.");
        }
        EvaluationTemplateService.Milestone milestone = milestoneOf(group, milestoneName);
        SupervisorEvaluation evaluation = evaluationRepository.findByEnrollmentIdAndMilestone(enrollmentId, milestone.name())
                .orElseGet(() -> newEvaluation(group, enrollment, milestone));
        if (ANSWERED.equals(evaluation.getStatus())) throw new IllegalStateException("El supervisor ya respondió esta evaluación.");

        //si ya se envio, se mantiene la pauta con que se envio
        EvaluationTemplate template = evaluation.getTemplateId() != null
                ? templateService.findById(evaluation.getTemplateId()).orElse(null)
                : templateService.findPublished(group.getIdGroup(), milestone.slot()).orElse(null);
        if (template == null) throw new IllegalStateException("Primero publica la pauta de esta evaluación.");
        return new Prepared(group, enrollment, evaluation, template, milestone);
    }

    private SupervisorEvaluation newEvaluation(PracticeGroup group, PracticeEnrollment enrollment,
                                               EvaluationTemplateService.Milestone milestone) {
        SupervisorEvaluation evaluation = new SupervisorEvaluation();
        evaluation.setEnrollmentId(enrollment.getEnrollmentId());
        evaluation.setGroupId(group.getIdGroup());
        evaluation.setMilestone(milestone.name());
        evaluation.setCreatedAt(LocalDateTime.now());
        return evaluation;
    }

    private void markSent(SupervisorEvaluation evaluation, EvaluationTemplate template, PracticeEnrollment enrollment) {
        templateService.lock(template);
        if (!SENT.equals(evaluation.getStatus())) {
            evaluation.setStatus(SENT);
            evaluation.setSentAt(LocalDateTime.now());
        }
        evaluation.setTemplateId(template.getTemplateId());
        evaluationRepository.save(evaluation);
    }

    private void send(PracticeGroup group, PracticeEnrollment enrollment, SupervisorEvaluation evaluation,
                      EvaluationTemplate template, String label, boolean reminder) {
        markSent(evaluation, template, enrollment);
        String token = linkService.issue(enrollment, SupervisorLinkService.EVALUATION, evaluation.getEvaluationId());
        String student = nameOr(enrollment.getStudentId(), "tu estudiante en práctica");

        List<String> paragraphs = new ArrayList<>();
        paragraphs.add("Hola " + enrollment.getSupervisorName() + ":");
        paragraphs.add(reminder
                ? "Te recordamos que está pendiente la " + label.toLowerCase() + " de " + student + "."
                : student + " llegó al momento de su " + label.toLowerCase() + " de práctica en "
                        + enrollment.getSupervisorCompany() + ". Te pedimos completar la pauta de evaluación.");
        paragraphs.add("Toma unos minutos y no necesitas crear una cuenta. Todos los campos son obligatorios.");
        paragraphs.add("El enlace es personal y vence el " + linkService.expiresAt().format(DATE_FORMAT) + ".");
        try {
            notificationClient.sendEmail(new EmailRequestDTO(
                    enrollment.getSupervisorEmail(), enrollment.getSupervisorName(),
                    "PrácticasHub – " + (reminder ? "Recordatorio: " : "") + label + " de " + student,
                    label + " de práctica", paragraphs,
                    linkService.evaluationUrlFor(token), "Evaluar al estudiante",
                    "Este correo lo envió PrácticasHub por la práctica del curso " + group.getCourseName()
                            + ". Si no corresponde, puedes ignorarlo."));
        } catch (Exception e) {
            System.err.println("Error enviando la evaluación al supervisor: " + e.getMessage());
            throw new IllegalStateException("No se pudo enviar el correo. Copia el enlace y envíalo por otro medio.");
        }
        if (reminder) {
            evaluation.setReminderCount(evaluation.getReminderCount() + 1);
            evaluation.setLastReminderAt(LocalDateTime.now());
            evaluationRepository.save(evaluation);
        }
    }

    private void publish(PracticeGroup group, PracticeEnrollment enrollment, SupervisorEvaluation evaluation, String label) {
        if (evaluation.isPublishedToStudent()) return;
        evaluation.setPublishedToStudent(true);
        evaluation.setPublishedAt(LocalDateTime.now());
        evaluationRepository.save(evaluation);
        notify(enrollment.getStudentId(), group, "EVALUATION_PUBLISHED", "Evaluación del supervisor",
                "Tu docente publicó la " + label.toLowerCase() + " que hizo tu supervisor. Ya puedes verla en el resumen de tu práctica.",
                group.getIdGroup());
    }

    private Access access(String token) {
        SupervisorAccessToken access = linkService.find(token, SupervisorLinkService.EVALUATION);
        PracticeEnrollment enrollment = enrollmentRepository.findById(access.getEnrollmentId()).orElseThrow(InvalidLinkException::new);
        linkService.resolve(token, SupervisorLinkService.EVALUATION, enrollment);
        SupervisorEvaluation evaluation = evaluationRepository.findById(access.getEvaluationId() == null ? -1L : access.getEvaluationId())
                .filter(e -> e.getEnrollmentId().equals(enrollment.getEnrollmentId()))
                .orElseThrow(InvalidLinkException::new);
        PracticeGroup group = findGroup(enrollment);
        EvaluationTemplate template = templateService.findById(evaluation.getTemplateId()).orElseThrow(InvalidLinkException::new);
        return new Access(access, enrollment, group, evaluation, template);
    }

    private EvaluationAnswer row(Access a, int s, int i, Integer k, Double grade, boolean notApplicable, String text) {
        EvaluationAnswer answer = new EvaluationAnswer();
        answer.setEvaluationId(a.evaluation.getEvaluationId());
        answer.setSectionIndex(s);
        answer.setItemIndex(i);
        answer.setActivityIndex(k);
        answer.setGrade(grade);
        answer.setNotApplicable(notApplicable);
        answer.setText(text);
        return answer;
    }

    //respuestas guardadas -> misma forma que las envia el supervisor
    private EvaluationAnswersDTO answersOf(SupervisorEvaluation evaluation, EvaluationTemplateDTO template) {
        EvaluationAnswersDTO answers = new EvaluationAnswersDTO();
        for (TemplateSectionDTO section : template.getSections()) {
            SectionAnswersDTO sectionAnswers = new SectionAnswersDTO();
            for (int i = 0; i < section.getItems().size(); i++) sectionAnswers.getItems().add(new ItemAnswerDTO());
            answers.getSections().add(sectionAnswers);
        }
        List<EvaluationAnswer> rows = new ArrayList<>(answerRepository.findByEvaluationId(evaluation.getEvaluationId()));
        rows.sort((x, y) -> Integer.compare(x.getActivityIndex() == null ? -1 : x.getActivityIndex(),
                y.getActivityIndex() == null ? -1 : y.getActivityIndex()));
        for (EvaluationAnswer row : rows) {
            if (row.getSectionIndex() >= answers.getSections().size()) continue;
            List<ItemAnswerDTO> items = answers.getSections().get(row.getSectionIndex()).getItems();
            if (row.getItemIndex() >= items.size()) continue;
            ItemAnswerDTO item = items.get(row.getItemIndex());
            if (row.getActivityIndex() != null) {
                item.getActivities().add(new ActivityAnswerDTO(row.getText(), row.getGrade()));
            } else {
                item.setGrade(row.getGrade());
                item.setNotApplicable(row.isNotApplicable());
                item.setText(row.getText());
            }
        }
        return answers;
    }

    private SupervisorEvaluationDTO toDTO(SupervisorEvaluation evaluation, EvaluationTemplateService.Milestone milestone,
                                          Double requiredHours, Boolean reached) {
        if (evaluation == null || evaluation.getEvaluationId() == null) {
            return new SupervisorEvaluationDTO(null, milestone.name(), milestone.label(), NOT_SENT, requiredHours, reached,
                    null, 0, null, null, null, null, false, null, null, null);
        }
        EvaluationTemplateDTO template = templateService.findById(evaluation.getTemplateId()).map(templateService::toDTO).orElse(null);
        EvaluationAnswersDTO answers = null;
        List<Double> sectionGrades = null;
        if (ANSWERED.equals(evaluation.getStatus()) && template != null) {
            answers = answersOf(evaluation, template);
            sectionGrades = EvaluationGradeCalculator.sectionGrades(template.getSections(), answers);
        }
        return new SupervisorEvaluationDTO(evaluation.getEvaluationId(), milestone.name(), milestone.label(),
                evaluation.getStatus(), requiredHours, reached, evaluation.getSentAt(), evaluation.getReminderCount(),
                evaluation.getSupervisorName(), evaluation.getSubmittedAt(), evaluation.getFinalGrade(), sectionGrades,
                evaluation.isPublishedToStudent(), evaluation.getPublishedAt(), template, answers);
    }

    private EvaluationTemplateService.Milestone milestoneOf(PracticeGroup group, String name) {
        return templateService.milestonesFor(group.getEvaluationMode()).stream()
                .filter(m -> m.name().equals(name)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Esa evaluación no está configurada en este grupo."));
    }

    private String labelOf(PracticeGroup group, String milestoneName) {
        return templateService.milestonesFor(group.getEvaluationMode()).stream()
                .filter(m -> m.name().equals(milestoneName)).map(EvaluationTemplateService.Milestone::label)
                .findFirst().orElse("Evaluación");
    }

    private double hoursOf(PracticeEnrollment enrollment) {
        return logRepository.findByIdEnrollment(enrollment.getEnrollmentId()).stream()
                .mapToDouble((PracticeLog log) -> log.getTotalHours() == null ? 0 : log.getTotalHours()).sum();
    }

    private void checkProfessor(PracticeGroup group, Long professorId) {
        if (!group.getIdProfessor().equals(professorId)) {
            throw new SecurityException("ACCESO DENEGADO: No eres el profesor de este grupo.");
        }
    }

    private void notify(Long userId, PracticeGroup group, String type, String title, String message, Long referenceId) {
        try {
            notificationClient.sendNotification(userId, group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                    type, title, message, null, referenceId);
        } catch (Exception e) {
            System.err.println("Error enviando la notificación " + type + ": " + e.getMessage());
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
