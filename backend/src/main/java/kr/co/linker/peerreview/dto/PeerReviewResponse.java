package kr.co.linker.peerreview.dto;

import kr.co.linker.peerreview.domain.PeerReview;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Peer Review 응답 DTO — 익명 처리 포함.
 *
 * @param id                  UUID
 * @param talentId            평가 대상 인력 UUID
 * @param reviewerId          평가자 UUID (익명이면 null)
 * @param contractId          계약 UUID
 * @param collaborationScore  협업 점수
 * @param technicalScore      기술 점수
 * @param reliabilityScore    신뢰도 점수
 * @param averageScore        평균 점수
 * @param comment             코멘트
 * @param createdAt           등록 시각
 */
public record PeerReviewResponse(
        UUID id,
        UUID talentId,
        UUID reviewerId,
        UUID contractId,
        int collaborationScore,
        int technicalScore,
        int reliabilityScore,
        double averageScore,
        String comment,
        OffsetDateTime createdAt
) {
    /**
     * PeerReview → PeerReviewResponse 변환. 익명 처리.
     *
     * @param pr           Peer Review 엔티티
     * @param requesterId  요청자 UUID (admin이면 reviewerId 노출)
     * @param isAdmin      관리자 여부
     * @return 응답 DTO
     */
    public static PeerReviewResponse from(PeerReview pr, UUID requesterId, boolean isAdmin) {
        UUID reviewerId = pr.isAnonymous() && !isAdmin ? null : pr.getReviewerId();
        return new PeerReviewResponse(
                pr.getId(), pr.getTalentId(), reviewerId, pr.getContractId(),
                pr.getCollaborationScore(), pr.getTechnicalScore(), pr.getReliabilityScore(),
                pr.averageScore(), pr.getComment(), pr.getCreatedAt()
        );
    }
}
