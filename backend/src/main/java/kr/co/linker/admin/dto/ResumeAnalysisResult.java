package kr.co.linker.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import kr.co.linker.talent.domain.TalentCategory;
import kr.co.linker.talent.domain.TalentField;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ResumeAnalysisResult(
        String name,
        String nameEn,
        String phone,
        String workType,
        Integer desiredRate,
        String category,
        String field,
        List<String> skills,
        String birthDate,
        String email,
        String address,
        String skillGrade,
        String title,
        List<Exp> educations,
        List<Exp> companyExps,
        List<Exp> projectExps,
        List<Exp> certifications,
        Integer itCareerMonths,
        String photoKey,
        String resumeKey,
        Double confidenceScore,
        Boolean needsManualReview
) {
    public record Exp(
        String companyName,
        String projectName,
        String role,
        String startDate,
        String endDate,
        String description,
        List<String> techStack
    ) {
        public Exp {
            if (techStack == null) { techStack = List.of(); }
        }
    }

    public ResumeAnalysisResult {
        if (skills == null) { skills = List.of(); }
        if (educations == null) { educations = List.of(); }
        if (companyExps == null) { companyExps = List.of(); }
        if (projectExps == null) { projectExps = List.of(); }
        if (certifications == null) { certifications = List.of(); }
        if (needsManualReview == null) { needsManualReview = false; }
    }

    public TalentCategory parsedCategory() {
        try {
            return category != null ? TalentCategory.valueOf(category.toUpperCase()) : null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public TalentField parsedField() {
        try {
            return field != null ? TalentField.valueOf(field.toUpperCase()) : null;
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
