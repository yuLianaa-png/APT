package com.top.practice_service.services;

import com.top.practice_service.DTO.ConversationDTO;
import com.top.practice_service.DTO.MessageDTO;
import com.top.practice_service.clients.AuthClient;
import com.top.practice_service.clients.NotificationClient;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.models.PracticeMessage;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import com.top.practice_service.repositories.PracticeLogRepository;
import com.top.practice_service.repositories.PracticeMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

//Mensajes entre el docente y cada estudiante de su grupo. Solo los dos participantes pueden leerlos,
//el contenido se guarda cifrado y la notificacion avisa que hay un mensaje sin mostrar su texto.
@Service
public class PracticeMessageService {
    private static final int MAX_LENGTH = 2000;
    private static final int PREVIEW_LENGTH = 80;

    @Autowired
    private PracticeMessageRepository messageRepository;
    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;
    @Autowired
    private PracticeGroupRepository groupRepository;
    @Autowired
    private PracticeLogRepository logRepository;
    @Autowired
    private PracticeRiskService riskService;
    @Autowired
    private MessageCryptoService cryptoService;
    @Autowired
    private NotificationClient notificationClient;
    @Autowired
    private AuthClient authClient;

    public List<MessageDTO> getConversation(Long enrollmentId, Long userId, String role) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        checkParticipant(enrollment, findGroup(enrollment), userId, role);

        List<PracticeMessage> messages = messageRepository.findByEnrollmentIdOrderByCreatedAtAsc(enrollmentId);
        //al abrir la conversacion, lo que envio el otro participante queda leido
        LocalDateTime now = LocalDateTime.now();
        List<PracticeMessage> unread = messages.stream()
                .filter(message -> !message.getSenderId().equals(userId) && message.getReadAt() == null)
                .toList();
        unread.forEach(message -> message.setReadAt(now));
        if (!unread.isEmpty()) messageRepository.saveAll(unread);

        return messages.stream().map(this::toDTO).toList();
    }

    public MessageDTO send(Long enrollmentId, Long userId, String role, String content) {
        PracticeEnrollment enrollment = findEnrollment(enrollmentId);
        PracticeGroup group = findGroup(enrollment);
        String senderRole = checkParticipant(enrollment, group, userId, role);

        if (!"Activo".equalsIgnoreCase(group.getStatus())) {
            throw new IllegalStateException("ACCION DENEGADA: El grupo está Inactivo y se encuentra en modo de solo lectura.");
        }
        String text = content == null ? "" : content.trim();
        if (text.isEmpty()) throw new IllegalArgumentException("Escribe un mensaje antes de enviarlo.");
        if (text.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("El mensaje no puede superar los " + MAX_LENGTH + " caracteres.");
        }

        PracticeMessage saved = messageRepository.save(new PracticeMessage(null, enrollmentId, userId, senderRole,
                cryptoService.encrypt(text), LocalDateTime.now(), null));

        //se avisa al otro participante; el texto del mensaje no viaja en la notificacion
        boolean fromStudent = "ESTUDIANTE".equals(senderRole);
        Long recipientId = fromStudent ? group.getIdProfessor() : enrollment.getStudentId();
        try {
            String name = userName(userId);
            notificationClient.sendNotification(
                    recipientId, group.getIdGroup(), group.getCourseName(), group.getGroupCode(),
                    "MESSAGE", "Nuevo mensaje",
                    (name != null ? name : (fromStudent ? "Un estudiante" : "Tu docente")) + " te envió un mensaje.",
                    "/mensajes", enrollmentId);
        } catch (Exception e) {
            System.err.println("Error notificando el mensaje: " + e.getMessage());
        }
        return toDTO(saved);
    }

    //bandeja del docente: una conversacion por estudiante, las con mensajes sin leer primero
    public List<ConversationDTO> getGroupConversations(Long groupId, Long professorId) {
        PracticeGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Grupo de práctica no encontrado."));
        if (!group.getIdProfessor().equals(professorId)) {
            throw new SecurityException("ACCESO DENEGADO: No eres el profesor de este grupo.");
        }

        List<ConversationDTO> response = new ArrayList<>();
        for (PracticeEnrollment enrollment : enrollmentRepository.findByPracticeGroupId(groupId)) {
            List<PracticeMessage> messages = messageRepository.findByEnrollmentIdOrderByCreatedAtAsc(enrollment.getEnrollmentId());
            PracticeMessage last = messages.isEmpty() ? null : messages.get(messages.size() - 1);
            String preview = null;
            if (last != null) {
                preview = cryptoService.decrypt(last.getEncryptedContent());
                if (preview.length() > PREVIEW_LENGTH) preview = preview.substring(0, PREVIEW_LENGTH) + "…";
            }
            String risk = riskService.evaluate(group, enrollment,
                    logRepository.findByIdEnrollment(enrollment.getEnrollmentId())).getLevel();

            response.add(new ConversationDTO(
                    enrollment.getEnrollmentId(),
                    enrollment.getStudentId(),
                    userName(enrollment.getStudentId()),
                    preview,
                    last != null ? last.getCreatedAt() : null,
                    unreadFor(enrollment.getEnrollmentId(), professorId),
                    risk));
        }
        response.sort(Comparator.comparing((ConversationDTO c) -> c.getUnread() == 0)
                .thenComparing(ConversationDTO::getLastMessageAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return response;
    }

    public long unreadFor(Long enrollmentId, Long readerId) {
        return messageRepository.countByEnrollmentIdAndSenderIdNotAndReadAtIsNull(enrollmentId, readerId);
    }

    //se usa al eliminar un grupo
    public void deleteByEnrollment(Long enrollmentId) {
        messageRepository.deleteAll(messageRepository.findByEnrollmentId(enrollmentId));
    }

    //solo el estudiante de la vinculacion y el docente del grupo; devuelve el rol con que participa
    private String checkParticipant(PracticeEnrollment enrollment, PracticeGroup group, Long userId, String role) {
        if ("ESTUDIANTE".equalsIgnoreCase(role) && enrollment.getStudentId().equals(userId)) return "ESTUDIANTE";
        if ("PROFESOR".equalsIgnoreCase(role) && group.getIdProfessor().equals(userId)) return "PROFESOR";
        throw new SecurityException("ACCESO DENEGADO: No participas en esta conversación.");
    }

    private MessageDTO toDTO(PracticeMessage message) {
        return new MessageDTO(message.getMessageId(), message.getEnrollmentId(), message.getSenderId(),
                message.getSenderRole(), cryptoService.decrypt(message.getEncryptedContent()),
                message.getCreatedAt(), message.getReadAt());
    }

    private String userName(Long userId) {
        try {
            return authClient.getUserById(userId).getName();
        } catch (Exception e) {
            return null;
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
