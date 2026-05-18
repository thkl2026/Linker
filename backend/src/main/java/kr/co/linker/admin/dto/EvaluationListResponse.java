package kr.co.linker.admin.dto;

import kr.co.linker.project.domain.ProjectOpportunity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EvaluationListResponse(
        UUID id,
        String title,
        String clientCompany,
        String pmName,
        int requiredHeadcount,
        String endDate,
        String evalStatus,
        BigDecimal evaluationScore,
        String evaluatedAt
) {
    private static final int CRITICAL_DAYS = 60;

    public static EvaluationListResponse from(ProjectOpportunity p, String pmName) {
        String status;
        if (p.getEvaluatedAt() != null) {
            status = "COMPLETED";
        } else if (p.getEndDate() != null && p.getEndDate().isBefore(LocalDate.now().minusDays(CRITICAL_DAYS))) {
            status = "CRITICAL";
        } else {
            status = "PENDING";
        }
        return new EvaluationListResponse(
                p.getId(),
                p.getTitle(),
                p.getClientCompany(),
                pmName,
                p.getRequiredHeadcount(),
                p.getEndDate() != null ? p.getEndDate().toString() : null,
                status,
                p.getEvaluationScore(),
                p.getEvaluatedAt() != null ? p.getEvaluatedAt().toString() : null
        );
    }
}
