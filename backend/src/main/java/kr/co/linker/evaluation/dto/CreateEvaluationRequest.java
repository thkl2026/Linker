package kr.co.linker.evaluation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

/**
 * 평가 등록 요청 DTO (F-4.2)
 *
 * @param contractId    계약 UUID
 * @param evaluatorRole 평가자 역할 (PM | PEER)
 * @param rawFeedback   자유 형식 피드백 원문
 */
public record CreateEvaluationRequest(
        @NotNull UUID contractId,
        @NotBlank @Pattern(regexp = "PM|PEER") String evaluatorRole,
        @NotBlank String rawFeedback
) {}
