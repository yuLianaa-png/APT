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

        Optional<PracticeGroup> groupOpt = groupRepository.findByGroupCode(groupCode);

        if (groupOpt.isEmpty()) {
            throw new RuntimeException("Codigo no corresponde a ningun grupo de practica");
        }
        PracticeGroup group = groupOpt.get();
        if (enrollmentRepository.existsByPracticeGroupIdAndStudentId(group.getIdGroup(), studentId)) {
            throw new RuntimeException("Ya se encuentra esperando confirmación para entrar al grupo");
        }

        PracticeEnrollment enrollment = new PracticeEnrollment();
        enrollment.setPracticeGroupId(group.getIdGroup());
        enrollment.setStudentId(studentId);
        enrollment.setStatus("PENDIENTE");
        enrollment.setEnrollmentDate(LocalDateTime.now());

        return enrollmentRepository.save(enrollment);
    }

    public List<PracticeEnrollment> getPendingEnrollment(Long groupId, Long professorId){
        PracticeGroup group = groupRepository.findById(groupId).orElseThrow(() -> new RuntimeException("Grupo de práctica no existe"));

        if(!group.getIdProfessor().equals(professorId)){
            throw new RuntimeException("ACCESO DENEGADO: No eres el administrador de este grupo");
        }

        return enrollmentRepository.findByPracticeGroupIdAndStatus(group.getIdGroup(), "PENDIENTE");
    }

    public PracticeEnrollment updateEnrollmentStatus(Long enrollmentId, String newStatus, Long professorId){
        PracticeEnrollment enrollment = enrollmentRepository.findById(enrollmentId).orElseThrow(() -> new RuntimeException("La inscripción no existe"));

        PracticeGroup group = groupRepository.findById(enrollment.getPracticeGroupId()).orElseThrow(() -> new RuntimeException("Grupo no existe"));

        if(!group.getIdProfessor().equals(professorId)){
            throw new RuntimeException("ACCESO DENEGADO: No puedes modificar inscripciones de otros profesores");
        }

        enrollment.setStatus(newStatus.toUpperCase());
        return enrollmentRepository.save(enrollment);
    }

    public List<StudentEnrollmentDTO> getStudentEnrollments(Long studentId) {
        List<PracticeEnrollment> enrollments = enrollmentRepository.findByStudentId(studentId);
        List<StudentEnrollmentDTO> response = new java.util.ArrayList<>();

        for (PracticeEnrollment enrollment : enrollments) {
            groupRepository.findById(enrollment.getPracticeGroupId()).ifPresent(group -> {
                response.add(new StudentEnrollmentDTO(
                        enrollment.getEnrollmentId(),
                        enrollment.getStatus(),
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
}
