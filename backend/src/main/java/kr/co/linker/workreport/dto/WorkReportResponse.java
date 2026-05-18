package kr.co.linker.workreport.dto;

import kr.co.linker.workreport.domain.WorkReport;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 주간 업무 보고 응답 DTO (F-4.3)
 */
public record WorkReportResponse(
        UUID id,
        UUID contractId,
        UUID talentId,
        LocalDate reportWeek,
        String content,
        String aiRiskLevel,
        String aiRiskSummary,
        BigDecimal sentimentScore,
        OffsetDateTime createdAt
) {
    public static WorkReportResponse from(WorkReport r) {
        return new WorkReportResponse(
                r.getId(), r.getContractId(), r.getTalentId(),
                r.getReportWeek(), r.getContent(),
                r.getAiRiskLevel(), r.getAiRiskSummary(),
                r.getSentimentScore(), r.getCreatedAt()
        );
    }
}
