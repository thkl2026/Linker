package kr.co.linker.admin.dto;

import kr.co.linker.project.domain.ProjectOpportunity;
import kr.co.linker.project.domain.ProjectStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ProjectDetailResponse(
        UUID id,
        String title,
        String description,
        String clientCompany,
        String mainContractor,
        ProjectStatus status,
        String pmName,
        int requiredHeadcount,
        String startDate,
        String endDate,
        String workType,
        BigDecimal budgetMin,
        BigDecimal budgetMax,
        String requiredSkills,
        BigDecimal evaluationScore,
        String evaluationNote,
        String evaluatedAt,
        String awardStatus,
        BigDecimal awardAmount,
        String contractDate,
        String awardNote,
        String contractorContact,
        String createdAt,
        List<ProjectMemberResponse> members
) {
    public static ProjectDetailResponse from(ProjectOpportunity p, String pmName,
                                             List<ProjectMemberResponse> members) {
        return new ProjectDetailResponse(
                p.getId(),
                p.getTitle(),
                p.getDescription(),
                p.getClientCompany(),
                p.getMainContractor(),
                p.getStatus(),
                pmName,
                p.getRequiredHeadcount(),
                p.getStartDate() != null ? p.getStartDate().toString() : null,
                p.getEndDate() != null ? p.getEndDate().toString() : null,
                p.getWorkType() != null ? p.getWorkType().name() : null,
                p.getBudgetMin(),
                p.getBudgetMax(),
                p.getRequiredSkills(),
                p.getEvaluationScore(),
                p.getEvaluationNote(),
                p.getEvaluatedAt() != null ? p.getEvaluatedAt().toString() : null,
                p.getAwardStatus(),
                p.getAwardAmount(),
                p.getContractDate() != null ? p.getContractDate().toString() : null,
                p.getAwardNote(),
                p.getContractorContact(),
                p.getCreatedAt() != null ? p.getCreatedAt().toString() : null,
                members
        );
    }
}
