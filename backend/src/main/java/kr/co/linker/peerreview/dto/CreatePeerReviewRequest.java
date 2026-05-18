package kr.co.linker.peerreview.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/**
 * Peer Review 등록 요청 DTO.
 *
 * @param talentId           평가 대상 인력 UUID
 * @param contractId         계약 UUID (선택 — 같은 프로젝트 동료 확인용)
 * @param collaborationScore 협업 점수 (1~5)
 * @param technicalScore     기술 점수 (1~5)
 * @param reliabilityScore   신뢰도 점수 (1~5)
 * @param comment            자유 코멘트
 * @param anonymous          익명 제출 여부
 */
public record CreatePeerReviewRequest(
        @NotNull UUID talentId,
        UUID contractId,
        @NotNull @Min(1) @Max(5) int collaborationScore,
        @NotNull @Min(1) @Max(5) int technicalScore,
        @NotNull @Min(1) @Max(5) int reliabilityScore,
        String comment,
        boolean anonymous
) {}
