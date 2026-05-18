package kr.co.linker.peerreview.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 익명 다면 평가 엔티티 (F-4.5)
 *
 * <p>동료가 인력의 협업·기술·신뢰도를 1~5점으로 익명 평가한다.
 * 계약당 1인 1회 제한. peer_reviews 테이블에 매핑.
 */
@Entity
@Table(name = "peer_reviews",
       uniqueConstraints = @UniqueConstraint(columnNames = {"talent_id", "reviewer_id", "contract_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PeerReview {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "talent_id", nullable = false, columnDefinition = "uuid")
    private UUID talentId;

    @Column(name = "reviewer_id", nullable = false, columnDefinition = "uuid")
    private UUID reviewerId;

    @Column(name = "contract_id", columnDefinition = "uuid")
    private UUID contractId;

    @Column(name = "collaboration_score", nullable = false)
    private int collaborationScore;

    @Column(name = "technical_score", nullable = false)
    private int technicalScore;

    @Column(name = "reliability_score", nullable = false)
    private int reliabilityScore;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "is_anonymous", nullable = false)
    private boolean anonymous = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    /**
     * Peer Review를 생성한다.
     *
     * @param talentId            평가 대상 인력 UUID
     * @param reviewerId          평가자 UUID
     * @param contractId          계약 UUID (선택)
     * @param collaborationScore  협업 점수 (1~5)
     * @param technicalScore      기술 점수 (1~5)
     * @param reliabilityScore    신뢰도 점수 (1~5)
     * @param comment             코멘트 (선택)
     * @param anonymous           익명 여부
     * @return Peer Review 인스턴스
     */
    public static PeerReview create(UUID talentId, UUID reviewerId, UUID contractId,
                                     int collaborationScore, int technicalScore,
                                     int reliabilityScore, String comment, boolean anonymous) {
        validate(collaborationScore, "collaborationScore");
        validate(technicalScore, "technicalScore");
        validate(reliabilityScore, "reliabilityScore");

        PeerReview pr = new PeerReview();
        pr.id = UUID.randomUUID();
        pr.talentId = talentId;
        pr.reviewerId = reviewerId;
        pr.contractId = contractId;
        pr.collaborationScore = collaborationScore;
        pr.technicalScore = technicalScore;
        pr.reliabilityScore = reliabilityScore;
        pr.comment = comment;
        pr.anonymous = anonymous;
        return pr;
    }

    /** 평균 점수를 반환한다. */
    public double averageScore() {
        return (collaborationScore + technicalScore + reliabilityScore) / 3.0;
    }

    private static void validate(int score, String field) {
        if (score < 1 || score > 5) {
            throw new IllegalArgumentException(field + "는 1~5 범위여야 합니다: " + score);
        }
    }
}
