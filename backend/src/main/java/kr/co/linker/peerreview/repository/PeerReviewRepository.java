package kr.co.linker.peerreview.repository;

import kr.co.linker.peerreview.domain.PeerReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Peer Review Repository. */
public interface PeerReviewRepository extends JpaRepository<PeerReview, UUID> {

    List<PeerReview> findByTalentIdOrderByCreatedAtDesc(UUID talentId);

    Optional<PeerReview> findByTalentIdAndReviewerIdAndContractId(
            UUID talentId, UUID reviewerId, UUID contractId);

    /** 인력의 Peer Review 평균 점수를 반환한다. */
    @Query("""
            SELECT AVG((pr.collaborationScore + pr.technicalScore + pr.reliabilityScore) / 3.0)
            FROM PeerReview pr WHERE pr.talentId = :talentId
            """)
    Optional<Double> findAverageScoreByTalentId(UUID talentId);

    /** talentId 별 평균 점수·리뷰 수를 한 번에 조회한다. */
    @Query("""
            SELECT pr.talentId,
                   AVG((pr.collaborationScore + pr.technicalScore + pr.reliabilityScore) / 3.0),
                   COUNT(pr)
            FROM PeerReview pr
            GROUP BY pr.talentId
            """)
    List<Object[]> findAvgScoreAndCountGroupedByTalent();

    long countByCreatedAtAfter(java.time.OffsetDateTime since);

    /** 평균 점수가 threshold 이상인 talent 수 */
    @Query("""
            SELECT COUNT(DISTINCT pr.talentId)
            FROM PeerReview pr
            GROUP BY pr.talentId
            HAVING AVG((pr.collaborationScore + pr.technicalScore + pr.reliabilityScore) / 3.0) >= :threshold
            """)
    List<Long> countTalentsByMinAvgScore(@Param("threshold") double threshold);
}
