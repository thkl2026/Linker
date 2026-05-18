package kr.co.linker.contract.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * 계약 생성 요청 DTO (F-3.1)
 *
 * @param projectId     프로젝트 UUID
 * @param talentId      인력 프로필 UUID
 * @param unitPrice     단가 (만원/월)
 * @param totalAmount   계약 총액
 * @param contractTerms 계약 조건 본문
 */
public record CreateContractRequest(
        @NotNull UUID projectId,
        @NotNull UUID talentId,
        @NotNull @Positive BigDecimal unitPrice,
        @NotNull @Positive BigDecimal totalAmount,
        String contractTerms
) {}
