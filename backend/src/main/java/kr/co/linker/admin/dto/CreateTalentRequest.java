package kr.co.linker.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import kr.co.linker.talent.domain.TalentCategory;
import kr.co.linker.talent.domain.TalentField;
import kr.co.linker.talent.domain.WorkType;

import java.math.BigDecimal;
import java.util.List;

public record CreateTalentRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 100) String nameEn,
        @Size(max = 50) String phone,
        TalentCategory category,
        TalentField field,
        List<TalentField> secondaryFields,
        WorkType workType,
        BigDecimal desiredRate,
        List<String> skills,
        String birthDate,
        String email,
        String address,
        String skillGrade,
        String title,
        String projectRole,
        String notes,
        String industryExperience,
        String referralSource,
        Integer itCareerMonths,
        String photoKey,
        String resumeKey,
        List<ExpReq> educations,
        List<ExpReq> companyExps,
        List<ExpReq> projectExps,
        List<ExpReq> trainings,
        List<ExpReq> certifications
) {
    public record ExpReq(
        String companyName,
        String projectName,
        String role,
        String startDate,
        String endDate,
        String description,
        List<String> techStack
    ) {}
}
