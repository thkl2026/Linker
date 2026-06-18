package kr.co.linker.admin.dto;

import kr.co.linker.talent.domain.AvailabilityStatus;
import kr.co.linker.talent.domain.TalentCategory;
import kr.co.linker.talent.domain.TalentField;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.domain.WorkType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record TalentAdminResponse(
        UUID id,
        UUID userId,
        String name,
        String nameEn,
        String phone,
        String email,
        TalentCategory category,
        TalentField field,
        List<TalentField> secondaryFields,
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
    private static final Logger log = LoggerFactory.getLogger(TalentAdminResponse.class);

    public static TalentAdminResponse from(TalentProfile p, String decryptedPhone, String decryptedEmail, String photoUrl, String resumeUrl) {
        List<String> skillNames;
        try {
            skillNames = p.getSkills().stream().map(s -> s.getSkillName()).toList();
        } catch (Exception e) {
            log.warn("[TALENT_RESPONSE] skills load failed id={}: {}", p.getId(), e.getMessage());
            skillNames = List.of();
        }

        List<TalentField> secondaryFields;
        try {
            secondaryFields = List.copyOf(p.getSecondaryFields());
        } catch (Exception e) {
            log.warn("[TALENT_RESPONSE] secondaryFields load failed id={}: {}", p.getId(), e.getMessage());
            secondaryFields = List.of();
        }

        return new TalentAdminResponse(
                p.getId(), p.getUserId(), p.getName(), p.getNameEn(),
                decryptedPhone,
                decryptedEmail,
                p.getCategory(), p.getField(),
                secondaryFields,
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
