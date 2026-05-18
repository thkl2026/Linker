package kr.co.linker.contract.dto;

import kr.co.linker.contract.domain.Contract;
import kr.co.linker.contract.domain.ContractStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * 계약 응답 DTO (F-3.1)
 */
public record ContractResponse(
        UUID id,
        UUID projectId,
        UUID talentId,
        BigDecimal unitPrice,
        BigDecimal totalAmount,
        ContractStatus status,
        String contractFileUrl,
        Map<String, Object> aiPriceAnalysis,
        OffsetDateTime signedAt,
        OffsetDateTime createdAt
) {
    public static ContractResponse from(Contract c) {
        return new ContractResponse(
                c.getId(), c.getProjectId(), c.getTalentId(),
                c.getUnitPrice(), c.getTotalAmount(),
                c.getStatus(), c.getContractFileUrl(),
                c.getAiPriceAnalysis(), c.getSignedAt(), c.getCreatedAt()
        );
    }
}
