package com.top.practice_service.services;

import com.top.practice_service.DTO.StudentEnrollmentDTO;
import com.top.practice_service.models.PracticeEnrollment;
import com.top.practice_service.models.PracticeGroup;
import com.top.practice_service.repositories.PracticeEnrollmentRepository;
import com.top.practice_service.repositories.PracticeGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class PracticeEnrollmentService {
    @Autowired
    private PracticeEnrollmentRepository enrollmentRepository;

    @Autowired
    private PracticeGroupRepository groupRepository;

    public PracticeEnrollment enrollStudent(String groupCode, Long studentId) {

        PracticeGroup group = groupRepository.findByGroupCode(groupCode)
                .orElseThrow(() -> new RuntimeException("El código ingresado no corresponde a ningún grupo de práctica."));

        if (!"Activo".equalsIgnoreCase(group.getStatus())) {
            throw new IllegalStateException("El grupo se encuentra Inactivo. No se permiten nuevas vinculaciones.");
        }

        if (enrollmentRepository.existsByPracticeGroupIdAndStudentId(group.getIdGroup(), studentId)) {
            throw new IllegalStateException("Ya te encuentras vinculado a este grupo de práctica.");
        }

        PracticeEnrollment enrollment = new PracticeEnrollment();
        enrollment.setPracticeGroupId(group.getIdGroup());
        enrollment.setStudentId(studentId);
        enrollment.setStatus("ACTIVA");
        enrollment.setEnrollmentDate(LocalDateTime.now());

        return enrollmentRepository.save(enrollment);
    }

    public List<StudentEnrollmentDTO> getStudentEnrollments(Long studentId) {
        List<PracticeEnrollment> enrollments = enrollmentRepository.findByStudentId(studentId);
        List<StudentEnrollmentDTO> response = new java.util.ArrayList<>();

        for (PracticeEnrollment enrollment : enrollments) {
            groupRepository.findById(enrollment.getPracticeGroupId()).ifPresent(group -> {
                response.add(new StudentEnrollmentDTO(
                        enrollment.getEnrollmentId(),
                        group.getStatus(),
                        enrollment.getEnrollmentDate(),
                        group.getGroupCode(),
                        group.getCourseName(),
                        group.getDescription(),
                        group.getPeriod(),
                        group.getIdProfessor()
                ));
            });
        }
        return response;
    }

    public Long getStudentIdByEnrollment(Long enrollmentId) {
        PracticeEnrollment enrollment = enrollmentRepository.findById(enrollmentId)
                .orElseThrow(() -> new RuntimeException("Inscripción no encontrada."));

        return enrollment.getStudentId();
    }
}
