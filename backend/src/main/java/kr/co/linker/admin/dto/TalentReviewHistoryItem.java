package kr.co.linker.admin.dto;

import kr.co.linker.peerreview.domain.PeerReview;

import java.util.UUID;

public record TalentReviewHistoryItem(
        UUID   id,
        int    collaborationScore,
        int    technicalScore,
        int    reliabilityScore,
        double avgScore,
        String comment,
        String createdAt
) {
    public static TalentReviewHistoryItem from(PeerReview pr) {
        return new TalentReviewHistoryItem(
                pr.getId(),
                pr.getCollaborationScore(),
                pr.getTechnicalScore(),
                pr.getReliabilityScore(),
                Math.round(pr.averageScore() * 10) / 10.0,
                pr.getComment(),
                pr.getCreatedAt() != null ? pr.getCreatedAt().toLocalDate().toString() : null
        );
    }
}
