package kr.co.linker.settlement.dto;

import kr.co.linker.settlement.domain.Settlement;
import kr.co.linker.settlement.domain.SettlementStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 정산 응답 DTO (F-4.1)
 */
public record SettlementResponse(
        UUID id,
        UUID contractId,
        UUID talentId,
        LocalDate settlementMonth,
        BigDecimal totalHours,
        BigDecimal unitPrice,
        BigDecimal grossAmount,
        BigDecimal deduction,
        BigDecimal netAmount,
        SettlementStatus status,
        UUID approvedBy,
        OffsetDateTime approvedAt,
        OffsetDateTime paidAt,
        OffsetDateTime createdAt
) {
    public static SettlementResponse from(Settlement s) {
        return new SettlementResponse(
                s.getId(), s.getContractId(), s.getTalentId(),
                s.getSettlementMonth(), s.getTotalHours(), s.getUnitPrice(),
                s.getGrossAmount(), s.getDeduction(), s.getNetAmount(),
                s.getStatus(), s.getApprovedBy(), s.getApprovedAt(),
                s.getPaidAt(), s.getCreatedAt()
        );
    }
}
