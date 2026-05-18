package kr.co.linker.admin.dto;

import kr.co.linker.talent.domain.TalentExperience;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ExperienceResponse(
        UUID id,
        String experienceType,
        String companyName,
        String projectName,
        String role,
        String department,
        String employmentType,
        LocalDate startDate,
        LocalDate endDate,
        String description,
        List<String> techStack,
        boolean isVerified,
        String verificationStatus
) {
    public static ExperienceResponse from(TalentExperience e) {
        return new ExperienceResponse(
                e.getId(),
                e.getExperienceType(),
                e.getCompanyName(),
                e.getProjectName(),
                e.getRole(),
                e.getDepartment(),
                e.getEmploymentType(),
                e.getStartDate(),
                e.getEndDate(),
                e.getDescription(),
                e.getTechStack(),
                e.isVerified(),
                e.getVerificationStatus()
        );
    }
}
