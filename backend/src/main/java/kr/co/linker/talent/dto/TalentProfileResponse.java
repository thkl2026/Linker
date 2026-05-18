package kr.co.linker.talent.dto;

import kr.co.linker.talent.domain.AvailabilityStatus;
import kr.co.linker.talent.domain.TalentCategory;
import kr.co.linker.talent.domain.TalentField;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.domain.WorkType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record TalentProfileResponse(
        UUID id,
        String name,
        TalentCategory category,
        TalentField field,
        AvailabilityStatus availabilityStatus,
        LocalDate availableFrom,
        BigDecimal totalScore,
        BigDecimal skillScore,
        BigDecimal reliabilityScore,
        BigDecimal performanceScore,
        WorkType workType,
        BigDecimal desiredRate,
        List<String> topSkills,
        Boolean isNewTalent,
        String title
) {
    public static TalentProfileResponse from(TalentProfile profile) {
        List<String> topSkills = profile.getSkills().stream()
                .sorted((a, b) -> levelOrder(b.getLevel()) - levelOrder(a.getLevel()))
                .limit(5)
                .map(s -> s.getSkillName())
                .toList();

        return new TalentProfileResponse(
                profile.getId(),
                profile.getName(),
                profile.getCategory(),
                profile.getField(),
                profile.getAvailabilityStatus(),
                profile.getAvailableFrom(),
                profile.getTotalScore(),
                profile.getSkillScore(),
                profile.getReliabilityScore(),
                profile.getPerformanceScore(),
                profile.getWorkType(),
                profile.getDesiredRate(),
                topSkills,
                profile.getIsNewTalent(),
                profile.getTitle()
        );
    }

    private static int levelOrder(String level) {
        return switch (level == null ? "" : level) {
            case "EXPERT" -> 4;
            case "SENIOR" -> 3;
            case "MID"    -> 2;
            case "JUNIOR" -> 1;
            default       -> 0;
        };
    }
}
