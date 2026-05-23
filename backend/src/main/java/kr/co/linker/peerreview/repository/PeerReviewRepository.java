package kr.co.linker.peerreview.repository;

import kr.co.linker.peerreview.domain.PeerReview;
import org.springframework.data.domain.Pageable;
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

    // ── 보고서 전용 ─────────────────────────────────────────────────────────────

    @Query("SELECT AVG(pr.collaborationScore), AVG(pr.technicalScore), AVG(pr.reliabilityScore) FROM PeerReview pr")
    Object[] avgScoresByDimension();

    @Query(value = """
            SELECT TO_CHAR(DATE_TRUNC('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
                   AVG((collaboration_score + technical_score + reliability_score) / 3.0) AS avg_score
            FROM peer_reviews
            WHERE created_at >= :since
            GROUP BY DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')
            ORDER BY DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')
            """, nativeQuery = true)
    List<Object[]> avgScoreMonthly(@Param("since") java.time.Instant since);

    /** talentId·avgScore·reviewCount — avgScore 내림차순 상위 N */
    @Query("""
            SELECT pr.talentId,
                   AVG((pr.collaborationScore + pr.technicalScore + pr.reliabilityScore) / 3.0) AS avg_score,
                   COUNT(pr) AS review_count
            FROM PeerReview pr
            GROUP BY pr.talentId
            ORDER BY avg_score DESC
            """)
    List<Object[]> topTalentsByAvgScore(Pageable pageable);

    @Query(value = """
            SELECT
              CASE
                WHEN avg_score >= 5                   THEN '5점'
                WHEN avg_score >= 4 AND avg_score < 5 THEN '4~5점'
                WHEN avg_score >= 3 AND avg_score < 4 THEN '3~4점'
                ELSE '3점 미만'
              END AS band,
              CASE
                WHEN avg_score >= 5   THEN 1
                WHEN avg_score >= 4   THEN 2
                WHEN avg_score >= 3   THEN 3
                ELSE 4
              END AS band_order,
              COUNT(*) AS cnt
            FROM (
              SELECT AVG((collaboration_score + technical_score + reliability_score) / 3.0) AS avg_score
              FROM peer_reviews
              GROUP BY talent_id
            ) t
            GROUP BY band, band_order
            ORDER BY band_order
            """, nativeQuery = true)
    List<Object[]> scoreDistribution();
}
