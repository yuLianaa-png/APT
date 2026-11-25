package com.top.practice_service.services;

import com.top.practice_service.DTO.EvaluationSettingsDTO;
import com.top.practice_service.DTO.EvaluationSlotDTO;
import com.top.practice_service.DTO.EvaluationTemplateDTO;
import com.top.practice_service.DTO.TemplateItemDTO;
import com.top.practice_service.DTO.TemplateSectionDTO;
import com.top.practice_service.models.EvaluationTemplate;
import com.top.practice_service.models.EvaluationTemplateItem;
import com.top.practice_service.models.EvaluationTemplateSection;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.repositories.EvaluationTemplateRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class EvaluationTemplateService {
    public static final String INTERMEDIATE = "INTERMEDIA";
    public static final String FINAL = "FINAL";
    public static final String BOTH = "AMBAS";

    public static final String DRAFT = "BORRADOR";
    public static final String PUBLISHED = "PUBLICADA";
    public static final String REPLACED = "REEMPLAZADA";

    public static final String SCORE = "NOTA";
    public static final String CALCULATED = "CALCULADO";
    public static final String ACTIVITIES = "ACTIVIDADES";
    public static final String TEXT = "TEXTO";

    public static final int MAX_ACTIVITIES = 30;
    private static final int MAX_SECTIONS = 10;
    private static final int MAX_ITEMS = 40;
    private static final int MAX_LABEL = 500;
    private static final int MAX_TITLE = 150;
    private static final int MAX_INSTRUCTIONS = 3000;

    //que pautas necesita cada modo
    private static final Map<String, List<String>> SLOTS = Map.of(
            "UNA_INTERMEDIA", List.of(INTERMEDIATE),
            "UNA_FINAL", List.of(FINAL),
            "DOS_MISMA", List.of(BOTH),
            "DOS_DISTINTAS", List.of(INTERMEDIATE, FINAL));
    private static final Map<String, String> SLOT_LABELS = Map.of(
            INTERMEDIATE, "Evaluación intermedia (50 % de las horas)",
            FINAL, "Evaluación final (100 % de las horas)",
            BOTH, "Pauta para las dos evaluaciones (50 % y 100 % de las horas)");
    private static final Set<String> TYPES = Set.of(SCORE, CALCULATED, ACTIVITIES, TEXT);

    //un momento en que el supervisor evalua: nombre, parte de la meta de horas y pauta que usa
    public record Milestone(String name, double share, String slot, String label) { }

    private static final Map<String, List<Milestone>> MILESTONES = Map.of(
            "UNA_INTERMEDIA", List.of(new Milestone(INTERMEDIATE, 0.5, INTERMEDIATE, "Evaluación intermedia")),
            "UNA_FINAL", List.of(new Milestone(FINAL, 1.0, FINAL, "Evaluación final")),
            "DOS_MISMA", List.of(new Milestone(INTERMEDIATE, 0.5, BOTH, "Evaluación intermedia"),
                    new Milestone(FINAL, 1.0, BOTH, "Evaluación final")),
            "DOS_DISTINTAS", List.of(new Milestone(INTERMEDIATE, 0.5, INTERMEDIATE, "Evaluación intermedia"),
                    new Milestone(FINAL, 1.0, FINAL, "Evaluación final")));

    @Autowired
    private EvaluationTemplateRepository templateRepository;
    @Autowired
    private PracticeGroupRepository groupRepository;

    @Transactional(readOnly = true)
    public EvaluationSettingsDTO getSettings(Long groupId, Long professorId) {
        PracticeGroup group = ownedGroup(groupId, professorId);
        return toSettings(group);
    }

    @Transactional
    public EvaluationSettingsDTO setMode(Long groupId, Long professorId, String mode) {
        PracticeGroup group = activeOwnedGroup(groupId, professorId);
        if (mode == null || !SLOTS.containsKey(mode)) {
            throw new IllegalArgumentException("Elige cuántas evaluaciones hace el centro de práctica y cuándo.");
        }
        if (templateRepository.existsByGroupIdAndLockedTrue(groupId) && !mode.equals(group.getEvaluationMode())) {
            throw new IllegalStateException("Ya se enviaron evaluaciones a los supervisores: la configuración no se puede cambiar.");
        }
        group.setEvaluationMode(mode);
        groupRepository.save(group);
        return toSettings(group);
    }

    //guarda el borrador de una pauta (el editor lo puede guardar a medias)
    @Transactional
    public EvaluationSettingsDTO saveDraft(Long groupId, Long professorId, String slot, EvaluationTemplateDTO payload) {
        PracticeGroup group = activeOwnedGroup(groupId, professorId);
        checkSlot(group, slot);
        if (payload == null) throw new IllegalArgumentException("Falta la pauta.");
        checkLimits(payload);

        EvaluationTemplate draft = templateRepository.findFirstByGroupIdAndSlotAndStatus(groupId, slot, DRAFT).orElse(null);
        if (draft == null) {
            EvaluationTemplate published = templateRepository.findFirstByGroupIdAndSlotAndStatus(groupId, slot, PUBLISHED).orElse(null);
            draft = new EvaluationTemplate();
            draft.setGroupId(groupId);
            draft.setSlot(slot);
            draft.setStatus(DRAFT);
            draft.setCreatedAt(LocalDateTime.now());
            //si la publicada ya se uso, el borrador sera la version siguiente
            draft.setVersion(published == null ? 1 : (published.isLocked() ? published.getVersion() + 1 : published.getVersion()));
        }
        draft.setInstructions(blankToNull(payload.getInstructions()));
        draft.getSections().clear();
        int position = 0;
        for (TemplateSectionDTO sectionDTO : payload.getSections()) {
            draft.getSections().add(toEntity(sectionDTO, position++));
        }
        draft.setUpdatedAt(LocalDateTime.now());
        templateRepository.save(draft);
        return toSettings(group);
    }

    //publica el borrador. desde ahi es la pauta que recibe el supervisor
    @Transactional
    public EvaluationSettingsDTO publish(Long groupId, Long professorId, String slot) {
        PracticeGroup group = activeOwnedGroup(groupId, professorId);
        checkSlot(group, slot);
        EvaluationTemplate draft = templateRepository.findFirstByGroupIdAndSlotAndStatus(groupId, slot, DRAFT)
                .orElseThrow(() -> new IllegalStateException("No hay un borrador para publicar."));
        validateForPublish(toDTO(draft));

        templateRepository.findFirstByGroupIdAndSlotAndStatus(groupId, slot, PUBLISHED).ifPresent(previous -> {
            //una pauta ya usada se conserva: las evaluaciones enviadas siguen apuntando a ella
            if (previous.isLocked()) {
                previous.setStatus(REPLACED);
                templateRepository.save(previous);
            } else {
                templateRepository.delete(previous);
            }
        });
        templateRepository.flush();

        draft.setStatus(PUBLISHED);
        draft.setPublishedAt(LocalDateTime.now());
        templateRepository.save(draft);
        return toSettings(group);
    }

    @Transactional
    public EvaluationSettingsDTO discardDraft(Long groupId, Long professorId, String slot) {
        PracticeGroup group = activeOwnedGroup(groupId, professorId);
        templateRepository.findFirstByGroupIdAndSlotAndStatus(groupId, slot, DRAFT).ifPresent(templateRepository::delete);
        return toSettings(group);
    }

    //------------------------------------------------------ usado por las evaluaciones (etapa 3)

    public List<Milestone> milestonesFor(String mode) {
        return mode == null ? List.of() : MILESTONES.getOrDefault(mode, List.of());
    }

    public java.util.Optional<EvaluationTemplate> findPublished(Long groupId, String slot) {
        return templateRepository.findFirstByGroupIdAndSlotAndStatus(groupId, slot, PUBLISHED);
    }

    public java.util.Optional<EvaluationTemplate> findById(Long templateId) {
        return templateId == null ? java.util.Optional.empty() : templateRepository.findById(templateId);
    }

    //desde el primer envio la pauta ya no se modifica: un cambio crea otra version
    public void lock(EvaluationTemplate template) {
        if (!template.isLocked()) {
            template.setLocked(true);
            templateRepository.save(template);
        }
    }

    //se usa al eliminar un grupo
    @Transactional
    public void deleteByGroup(Long groupId) {
        templateRepository.deleteAll(templateRepository.findByGroupId(groupId));
    }

//validacion
    //limites que se exigen siempre, incluso a un borrador
    private void checkLimits(EvaluationTemplateDTO template) {
        if (template.getSections() == null) template.setSections(new ArrayList<>());
        if (template.getInstructions() != null && template.getInstructions().length() > MAX_INSTRUCTIONS) {
            throw new IllegalArgumentException("Las instrucciones no pueden superar los " + MAX_INSTRUCTIONS + " caracteres.");
        }
        if (template.getSections().size() > MAX_SECTIONS) {
            throw new IllegalArgumentException("La pauta puede tener como máximo " + MAX_SECTIONS + " secciones.");
        }
        int items = 0;
        for (TemplateSectionDTO section : template.getSections()) {
            if (section.getItems() == null) section.setItems(new ArrayList<>());
            if (section.getTitle() != null && section.getTitle().length() > MAX_TITLE) {
                throw new IllegalArgumentException("El título de una sección no puede superar los " + MAX_TITLE + " caracteres.");
            }
            for (TemplateItemDTO item : section.getItems()) {
                items++;
                if (item.getType() == null || !TYPES.contains(item.getType())) {
                    throw new IllegalArgumentException("Hay un criterio con un tipo no válido.");
                }
                if (item.getLabel() != null && item.getLabel().length() > MAX_LABEL) {
                    throw new IllegalArgumentException("Cada criterio puede tener como máximo " + MAX_LABEL + " caracteres.");
                }
            }
        }
        if (items > MAX_ITEMS) throw new IllegalArgumentException("La pauta puede tener como máximo " + MAX_ITEMS + " criterios.");
    }

    //todo lo que debe cumplir una pauta para que un supervisor la pueda llenar
    private void validateForPublish(EvaluationTemplateDTO template) {
        checkLimits(template);
        List<TemplateSectionDTO> sections = template.getSections();
        if (sections.isEmpty()) throw new IllegalArgumentException("La pauta no tiene secciones.");

        boolean finalGradable = false;
        boolean finalRequired = false;
        for (int s = 0; s < sections.size(); s++) {
            TemplateSectionDTO section = sections.get(s);
            String name = "la sección " + (s + 1);
            if (blank(section.getTitle())) throw new IllegalArgumentException("Falta el título de " + name + ".");
            name = "«" + section.getTitle().trim() + "»";
            if (section.getItems().isEmpty()) throw new IllegalArgumentException("La sección " + name + " no tiene criterios.");

            Set<String> labels = new HashSet<>();
            int activities = 0;
            int weighted = 0;
            int gradable = 0;
            double weights = 0;
            for (TemplateItemDTO item : section.getItems()) {
                String label = item.getLabel() == null ? "" : item.getLabel().trim();
                if (label.length() < 2) throw new IllegalArgumentException("Hay un criterio sin texto en " + name + ".");
                if (!labels.add(label.toLowerCase(Locale.ROOT))) {
                    throw new IllegalArgumentException("El criterio «" + shortText(label) + "» está repetido en " + name + ".");
                }
                switch (item.getType()) {
                    case CALCULATED -> {
                        Integer source = item.getSourceSection();
                        if (source == null || source < 0 || source >= sections.size() || source == s) {
                            throw new IllegalArgumentException("Elige de qué sección sale el promedio de «" + shortText(label) + "».");
                        }
                        TemplateSectionDTO origin = sections.get(source);
                        boolean hasScores = origin.getItems().stream().anyMatch(i -> SCORE.equals(i.getType()));
                        boolean hasCalculated = origin.getItems().stream().anyMatch(i -> CALCULATED.equals(i.getType()));
                        if (!hasScores || hasCalculated) {
                            throw new IllegalArgumentException("«" + shortText(label) + "» debe salir de una sección que tenga "
                                    + "criterios con nota y ningún otro criterio calculado.");
                        }
                        if (Boolean.TRUE.equals(item.getAllowNotApplicable())) {
                            throw new IllegalArgumentException("Un criterio calculado no puede marcarse como «No aplica».");
                        }
                    }
                    case ACTIVITIES -> {
                        activities++;
                        Integer min = item.getMinActivities();
                        if (min == null || min < 1 || min > MAX_ACTIVITIES) {
                            throw new IllegalArgumentException("El mínimo de actividades debe estar entre 1 y " + MAX_ACTIVITIES + ".");
                        }
                        if (Boolean.TRUE.equals(item.getAllowNotApplicable())) {
                            throw new IllegalArgumentException("La lista de actividades no puede marcarse como «No aplica».");
                        }
                    }
                    case TEXT -> {
                        if (item.getWeight() != null) {
                            throw new IllegalArgumentException("Una respuesta abierta no lleva nota ni ponderación.");
                        }
                    }
                    default -> { }
                }
                if (!TEXT.equals(item.getType())) {
                    gradable++;
                    if (item.getWeight() != null) {
                        if (item.getWeight() <= 0 || item.getWeight() > 100) {
                            throw new IllegalArgumentException("Las ponderaciones deben ser mayores que 0 y como máximo 100 %.");
                        }
                        weighted++;
                        weights += item.getWeight();
                    }
                    if (Boolean.TRUE.equals(section.getCountsForFinal()) && !Boolean.TRUE.equals(item.getAllowNotApplicable())) finalRequired = true;
                }
            }
            if (activities > 1) throw new IllegalArgumentException("La sección " + name + " tiene más de una lista de actividades.");
            if (weighted > 0) {
                if (!Boolean.TRUE.equals(section.getCountsForFinal())) {
                    throw new IllegalArgumentException("Las ponderaciones solo se usan en secciones que cuentan para la nota final.");
                }
                if (weighted != gradable) {
                    throw new IllegalArgumentException("En " + name + " pon ponderación a todos los criterios con nota o a ninguno.");
                }
                if (Math.abs(weights - 100) > 0.01) {
                    throw new IllegalArgumentException("Las ponderaciones de " + name + " suman " + round(weights) + " %: deben sumar 100 %.");
                }
            }
            if (Boolean.TRUE.equals(section.getCountsForFinal()) && gradable > 0) finalGradable = true;
        }
        if (!finalGradable) {
            throw new IllegalArgumentException("Marca al menos una sección con criterios con nota para la nota final.");
        }
        if (!finalRequired) {
            throw new IllegalArgumentException("En la nota final debe haber al menos un criterio que no admita «No aplica».");
        }
    }

//mapeo
    private EvaluationSettingsDTO toSettings(PracticeGroup group) {
        List<EvaluationSlotDTO> slots = new ArrayList<>();
        String mode = group.getEvaluationMode();
        if (mode != null && SLOTS.containsKey(mode)) {
            for (String slot : SLOTS.get(mode)) {
                EvaluationTemplateDTO published = templateRepository
                        .findFirstByGroupIdAndSlotAndStatus(group.getIdGroup(), slot, PUBLISHED).map(this::toDTO).orElse(null);
                EvaluationTemplateDTO draft = templateRepository
                        .findFirstByGroupIdAndSlotAndStatus(group.getIdGroup(), slot, DRAFT).map(this::toDTO).orElse(null);
                slots.add(new EvaluationSlotDTO(slot, SLOT_LABELS.get(slot), published, draft));
            }
        }
        return new EvaluationSettingsDTO(group.getIdGroup(), mode,
                !templateRepository.existsByGroupIdAndLockedTrue(group.getIdGroup()), slots);
    }

    public EvaluationTemplateDTO toDTO(EvaluationTemplate template) {
        List<TemplateSectionDTO> sections = new ArrayList<>();
        for (EvaluationTemplateSection section : template.getSections()) {
            List<TemplateItemDTO> items = new ArrayList<>();
            for (EvaluationTemplateItem item : section.getItems()) {
                items.add(new TemplateItemDTO(item.getType(), item.getLabel(), item.isAllowNotApplicable(),
                        item.getWeight(), item.getSourceSection(), item.getMinActivities()));
            }
            sections.add(new TemplateSectionDTO(section.getTitle(), section.isCountsForFinal(), items));
        }
        return new EvaluationTemplateDTO(template.getTemplateId(), template.getSlot(), template.getVersion(),
                template.getStatus(), template.isLocked(), template.getInstructions(), sections,
                template.getUpdatedAt(), template.getPublishedAt());
    }

    private EvaluationTemplateSection toEntity(TemplateSectionDTO dto, int position) {
        EvaluationTemplateSection section = new EvaluationTemplateSection();
        section.setPosition(position);
        section.setTitle(dto.getTitle() == null ? "" : dto.getTitle().trim());
        section.setCountsForFinal(Boolean.TRUE.equals(dto.getCountsForFinal()));
        int itemPosition = 0;
        for (TemplateItemDTO itemDTO : dto.getItems()) {
            EvaluationTemplateItem item = new EvaluationTemplateItem();
            item.setPosition(itemPosition++);
            item.setType(itemDTO.getType());
            item.setLabel(itemDTO.getLabel() == null ? "" : itemDTO.getLabel().trim());
            //cada tipo guarda solo lo que le corresponde
            item.setAllowNotApplicable(SCORE.equals(itemDTO.getType()) && Boolean.TRUE.equals(itemDTO.getAllowNotApplicable()));
            item.setWeight(TEXT.equals(itemDTO.getType()) ? null : itemDTO.getWeight());
            item.setSourceSection(CALCULATED.equals(itemDTO.getType()) ? itemDTO.getSourceSection() : null);
            item.setMinActivities(ACTIVITIES.equals(itemDTO.getType()) ? itemDTO.getMinActivities() : null);
            section.getItems().add(item);
        }
        return section;
    }

//permisos
    private PracticeGroup ownedGroup(Long groupId, Long professorId) {
        PracticeGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Grupo de práctica no encontrado."));
        if (!group.getIdProfessor().equals(professorId)) {
            throw new SecurityException("ACCESO DENEGADO: No eres el profesor de este grupo.");
        }
        return group;
    }

    private PracticeGroup activeOwnedGroup(Long groupId, Long professorId) {
        PracticeGroup group = ownedGroup(groupId, professorId);
        if (!"Activo".equalsIgnoreCase(group.getStatus())) {
            throw new IllegalStateException("ACCION DENEGADA: El grupo está Inactivo y se encuentra en modo de solo lectura.");
        }
        return group;
    }

    private void checkSlot(PracticeGroup group, String slot) {
        List<String> slots = group.getEvaluationMode() == null ? List.of() : SLOTS.getOrDefault(group.getEvaluationMode(), List.of());
        if (!slots.contains(slot)) {
            throw new IllegalArgumentException("Primero elige cuántas evaluaciones hace el centro de práctica.");
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String blankToNull(String value) {
        return blank(value) ? null : value.trim();
    }

    private static String shortText(String text) {
        String flat = text.replace('\n', ' ');
        return flat.length() <= 60 ? flat : flat.substring(0, 59) + "…";
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
