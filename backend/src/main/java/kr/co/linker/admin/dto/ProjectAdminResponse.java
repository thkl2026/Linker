package kr.co.linker.admin.dto;

import kr.co.linker.project.domain.ProjectOpportunity;
import kr.co.linker.project.domain.ProjectStatus;

import java.util.UUID;

public record ProjectAdminResponse(
        UUID id,
        String title,
        String clientCompany,
        String mainContractor,
        ProjectStatus status,
        String pmName,
        int requiredHeadcount,
        String startDate,
        String endDate,
        String createdAt,
        String awardStatus
) {
    public static ProjectAdminResponse from(ProjectOpportunity p, String pmName) {
        return new ProjectAdminResponse(
                p.getId(),
                p.getTitle(),
                p.getClientCompany(),
                p.getMainContractor(),
                p.getStatus(),
                pmName,
                p.getRequiredHeadcount(),
                p.getStartDate() != null ? p.getStartDate().toString() : null,
                p.getEndDate() != null ? p.getEndDate().toString() : null,
                p.getCreatedAt() != null ? p.getCreatedAt().toString() : null,
                p.getAwardStatus()
        );
    }
}
