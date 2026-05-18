package kr.co.linker.project.dto;

import kr.co.linker.project.domain.ProjectOpportunity;
import kr.co.linker.project.domain.ProjectStatus;
import kr.co.linker.talent.domain.WorkType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 프로젝트 기회 응답 DTO
 */
public record ProjectResponse(
        UUID id,
        String title,
        String description,
        String requiredSkills,
        BigDecimal budgetMin,
        BigDecimal budgetMax,
        WorkType workType,
        UUID pmId,
        ProjectStatus status,
        OffsetDateTime createdAt
) {
    /**
     * 엔티티 → 응답 DTO 변환
     *
     * @param project ProjectOpportunity 엔티티
     * @return 응답 DTO
     */
    public static ProjectResponse from(ProjectOpportunity project) {
        return new ProjectResponse(
                project.getId(),
                project.getTitle(),
                project.getDescription(),
                project.getRequiredSkills(),
                project.getBudgetMin(),
                project.getBudgetMax(),
                project.getWorkType(),
                project.getPmId(),
                project.getStatus(),
                project.getCreatedAt()
        );
    }
}
