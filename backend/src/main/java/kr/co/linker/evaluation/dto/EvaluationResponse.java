package kr.co.linker.evaluation.dto;

import kr.co.linker.evaluation.domain.Evaluation;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * 평가 응답 DTO (F-4.2)
 */
public record EvaluationResponse(
        UUID id,
        UUID contractId,
        UUID evaluatorId,
        String evaluatorRole,
        String rawFeedback,
        Map<String, Object> structuredFeedback,
        BigDecimal trustScore,
        OffsetDateTime createdAt
) {
    public static EvaluationResponse from(Evaluation e) {
        return new EvaluationResponse(
                e.getId(), e.getContractId(), e.getEvaluatorId(),
                e.getEvaluatorRole(), e.getRawFeedback(),
                e.getStructuredFeedback(), e.getTrustScore(), e.getCreatedAt()
        );
    }
}
