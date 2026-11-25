package com.top.practice_service.services;

import com.top.practice_service.DTO.ActivityAnswerDTO;
import com.top.practice_service.DTO.EvaluationAnswersDTO;
import com.top.practice_service.DTO.ItemAnswerDTO;
import com.top.practice_service.DTO.TemplateItemDTO;
import com.top.practice_service.DTO.TemplateSectionDTO;

import java.util.ArrayList;
import java.util.List;

public final class EvaluationGradeCalculator {
    private EvaluationGradeCalculator() { }

    public static Double sectionGrade(List<TemplateSectionDTO> sections, EvaluationAnswersDTO answers, int s) {
        TemplateSectionDTO section = sections.get(s);
        boolean weighted = section.getItems().stream()
                .anyMatch(i -> i.getWeight() != null && !EvaluationTemplateService.TEXT.equals(i.getType()));
        List<Double> values = new ArrayList<>();
        double weightedSum = 0;
        double weights = 0;

        for (int i = 0; i < section.getItems().size(); i++) {
            TemplateItemDTO item = section.getItems().get(i);
            ItemAnswerDTO answer = answer(answers, s, i);
            Double value = null;
            List<Double> activityGrades = new ArrayList<>();
            switch (item.getType()) {
                case EvaluationTemplateService.SCORE -> {
                    if (answer != null && !Boolean.TRUE.equals(answer.getNotApplicable())) value = answer.getGrade();
                }
                case EvaluationTemplateService.CALCULATED -> value = scoreAverage(sections, answers, item.getSourceSection());
                case EvaluationTemplateService.ACTIVITIES -> {
                    if (answer != null && answer.getActivities() != null) {
                        for (ActivityAnswerDTO activity : answer.getActivities()) {
                            if (activity.getGrade() != null) activityGrades.add(activity.getGrade());
                        }
                    }
                    if (!activityGrades.isEmpty()) value = average(activityGrades);
                }
                default -> { }
            }
            if (value == null) continue;
            if (weighted) {
                double weight = item.getWeight() == null ? 0 : item.getWeight();
                weightedSum += weight * value;
                weights += weight;
            } else if (!activityGrades.isEmpty()) {
                values.addAll(activityGrades);
            } else {
                values.add(value);
            }
        }
        if (weighted) return weights > 0 ? weightedSum / weights : null;
        return values.isEmpty() ? null : average(values);
    }

    public static List<Double> sectionGrades(List<TemplateSectionDTO> sections, EvaluationAnswersDTO answers) {
        List<Double> grades = new ArrayList<>();
        for (int s = 0; s < sections.size(); s++) {
            Double grade = sectionGrade(sections, answers, s);
            grades.add(grade == null ? null : round(grade));
        }
        return grades;
    }

    public static Double finalGrade(List<TemplateSectionDTO> sections, EvaluationAnswersDTO answers) {
        List<Double> grades = new ArrayList<>();
        for (int s = 0; s < sections.size(); s++) {
            if (!Boolean.TRUE.equals(sections.get(s).getCountsForFinal())) continue;
            Double grade = sectionGrade(sections, answers, s);
            if (grade != null) grades.add(grade);
        }
        return grades.isEmpty() ? null : round(average(grades));
    }

    //promedio de los criterios con nota de una seccion (para los CALCULADO)
    public static Double scoreAverage(List<TemplateSectionDTO> sections, EvaluationAnswersDTO answers, Integer s) {
        if (s == null || s < 0 || s >= sections.size()) return null;
        List<Double> values = new ArrayList<>();
        List<TemplateItemDTO> items = sections.get(s).getItems();
        for (int i = 0; i < items.size(); i++) {
            if (!EvaluationTemplateService.SCORE.equals(items.get(i).getType())) continue;
            ItemAnswerDTO answer = answer(answers, s, i);
            if (answer != null && !Boolean.TRUE.equals(answer.getNotApplicable()) && answer.getGrade() != null) {
                values.add(answer.getGrade());
            }
        }
        return values.isEmpty() ? null : average(values);
    }

    public static ItemAnswerDTO answer(EvaluationAnswersDTO answers, int s, int i) {
        if (answers == null || answers.getSections() == null || s >= answers.getSections().size()) return null;
        List<ItemAnswerDTO> items = answers.getSections().get(s).getItems();
        return items == null || i >= items.size() ? null : items.get(i);
    }

    private static double average(List<Double> values) {
        return values.stream().mapToDouble(Double::doubleValue).sum() / values.size();
    }

    public static double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
