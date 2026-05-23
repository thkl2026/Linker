package kr.co.linker.admin.dto;

import kr.co.linker.talent.domain.AvailabilityStatus;
import kr.co.linker.talent.domain.TalentCategory;
import kr.co.linker.talent.domain.TalentField;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.domain.WorkType;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record TalentAdminResponse(
        UUID id,
        UUID userId,
        String name,
        String nameEn,
        String phone,
        TalentCategory category,
        TalentField field,
        AvailabilityStatus availabilityStatus,
        WorkType workType,
        BigDecimal desiredRate,
        BigDecimal totalScore,
        List<String> skills,
        String title,
        String projectRole,
        String birthDate,
        String address,
        String skillGrade,
        String notes,
        String industryExperience,
        String referralSource,
        Integer itCareerMonths,
        String photoUrl,
        String resumeUrl
) {
    public static TalentAdminResponse from(TalentProfile p, String decryptedPhone, String photoUrl, String resumeUrl) {
        List<String> skillNames = p.getSkills().stream()
                .map(s -> s.getSkillName())
                .toList();
        return new TalentAdminResponse(
                p.getId(), p.getUserId(), p.getName(), p.getNameEn(),
                decryptedPhone,
                p.getCategory(), p.getField(),
                p.getAvailabilityStatus(), p.getWorkType(),
                p.getDesiredRate(), p.getTotalScore(),
                skillNames,
                p.getTitle(),
                p.getProjectRole(),
                p.getBirthDate() != null ? p.getBirthDate().toString() : null,
                p.getAddress(),
                p.getSkillGrade(),
                p.getNotes(),
                p.getIndustryExperience(),
                p.getReferralSource(),
                p.getItCareerMonths(),
                photoUrl,
                resumeUrl
        );
    }
}
