package kr.co.linker.talent.repository;

import kr.co.linker.talent.domain.AvailabilityStatus;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.domain.WorkType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * 인력 프로필 Repository
 *
 * <p>벡터 유사도 검색(F-2.2)은 Phase 2에서 네이티브 쿼리로 추가한다.
 */
public interface TalentProfileRepository extends JpaRepository<TalentProfile, UUID> {

    /**
     * 사용자 UUID로 프로필 조회 (Soft Delete 제외)
     *
     * @param userId 사용자 UUID
     * @return 프로필 (없거나 삭제됐으면 empty)
     */
    Optional<TalentProfile> findByUserIdAndDeletedAtIsNull(UUID userId);

    Optional<TalentProfile> findByPhoneAndDeletedAtIsNull(String phone);

    Optional<TalentProfile> findByEmailHashAndDeletedAtIsNull(String emailHash);

    Page<TalentProfile> findAllByDeletedAtIsNull(Pageable pageable);

    long countByDeletedAtIsNull();

    List<TalentProfile> findByDeletedAtIsNull();

    /**
     * 통합 검색: 이름 또는 기술스택명 포함, category/field 필터 (null 이면 전체)
     */
    /**
     * 통합 검색 — 네이티브 쿼리(문자열 컬럼 직접 비교)로 category/field 필터를 처리한다.
     * AttributeConverter 파라미터 바인딩 이슈를 우회하고, 결과 엔티티는 컨버터로 안전하게 하이드레이션된다.
     */
    @Query(value = """
            SELECT DISTINCT t.* FROM talent_profiles t
            LEFT JOIN talent_skills s ON s.talent_id = t.id
            LEFT JOIN project_members pm ON pm.talent_id = t.id
            LEFT JOIN project_opportunities po ON po.id = pm.project_id
            WHERE t.deleted_at IS NULL
              AND (:keyword IS NULL OR
                   LOWER(t.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS text), '%')) OR
                   LOWER(s.skill_name) LIKE LOWER(CONCAT('%', CAST(:keyword AS text), '%')) OR
                   LOWER(po.client_company) LIKE LOWER(CONCAT('%', CAST(:keyword AS text), '%')))
              AND (CAST(:category AS text) IS NULL OR t.category = CAST(:category AS text))
              AND (CAST(:field AS text) IS NULL OR t.field = CAST(:field AS text))
            """,
            countQuery = """
            SELECT COUNT(DISTINCT t.id) FROM talent_profiles t
            LEFT JOIN talent_skills s ON s.talent_id = t.id
            LEFT JOIN project_members pm ON pm.talent_id = t.id
            LEFT JOIN project_opportunities po ON po.id = pm.project_id
            WHERE t.deleted_at IS NULL
              AND (:keyword IS NULL OR
                   LOWER(t.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS text), '%')) OR
                   LOWER(s.skill_name) LIKE LOWER(CONCAT('%', CAST(:keyword AS text), '%')) OR
                   LOWER(po.client_company) LIKE LOWER(CONCAT('%', CAST(:keyword AS text), '%')))
              AND (CAST(:category AS text) IS NULL OR t.category = CAST(:category AS text))
              AND (CAST(:field AS text) IS NULL OR t.field = CAST(:field AS text))
            """,
            nativeQuery = true)
    Page<TalentProfile> search(
            @Param("keyword") String keyword,
            @Param("category") String category,
            @Param("field") String field,
            Pageable pageable
    );

    /**
     * 가용 상태·근무 형태·희망 단가 범위로 인력 검색
     *
     * <p>AI 매칭(F-2.2) 1차 필터. 벡터 유사도 정렬은 Phase 2에서 추가.
     *
     * @param status      가용 상태
     * @param workType    근무 형태 (null 이면 전체)
     * @param maxRate     최대 단가 (null 이면 무제한)
     * @param pageable    페이지네이션
     * @return 조건에 맞는 인력 페이지
     */
    @Query("""
            SELECT t FROM TalentProfile t
            WHERE t.deletedAt IS NULL
              AND t.availabilityStatus = :status
              AND (:workType IS NULL OR t.workType = :workType)
              AND (:maxRate IS NULL OR t.desiredRate IS NULL OR t.desiredRate <= :maxRate)
            ORDER BY t.totalScore DESC NULLS LAST
            """)
    Page<TalentProfile> searchAvailable(
            @Param("status") AvailabilityStatus status,
            @Param("workType") WorkType workType,
            @Param("maxRate") BigDecimal maxRate,
            Pageable pageable
    );

    /**
     * bonus_score만 직접 업데이트 — GENERATED ALWAYS 컬럼(total_score) 충돌 방지를 위해
     * 엔티티 로드 없이 JPQL로 단일 컬럼만 수정한다.
     */
    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE TalentProfile t
            SET t.bonusScore = :bonusScore
            WHERE t.id = :id AND t.deletedAt IS NULL
            """)
    int updateBonusScoreById(@Param("id") java.util.UUID id,
                             @Param("bonusScore") BigDecimal bonusScore);

    @Modifying(clearAutomatically = true)
    @Query("""
            UPDATE TalentProfile t
            SET t.notes = :notes
            WHERE t.id = :id AND t.deletedAt IS NULL
            """)
    int updateNotesById(@Param("id") java.util.UUID id,
                        @Param("notes") String notes);

    // ── 대시보드 통계용 ─────────────────────────────────────────────────────────

    @Query("SELECT t.category, COUNT(t) FROM TalentProfile t WHERE t.deletedAt IS NULL GROUP BY t.category ORDER BY COUNT(t) DESC")
    List<Object[]> countByCategory();

    @Query("SELECT t.skillGrade, COUNT(t) FROM TalentProfile t WHERE t.deletedAt IS NULL GROUP BY t.skillGrade ORDER BY COUNT(t) DESC")
    List<Object[]> countBySkillGrade();

    @Query("SELECT COUNT(t) FROM TalentProfile t WHERE t.deletedAt IS NULL AND t.bonusScore >= :min")
    long countByBonusScoreGe(@Param("min") BigDecimal min);

    @Query("SELECT COUNT(t) FROM TalentProfile t WHERE t.deletedAt IS NULL AND t.bonusScore >= :min AND t.bonusScore < :max")
    long countByBonusScoreGeLt(@Param("min") BigDecimal min, @Param("max") BigDecimal max);

    @Query("SELECT COUNT(t) FROM TalentProfile t WHERE t.deletedAt IS NULL AND t.bonusScore > :min AND t.bonusScore < :max")
    long countByBonusScoreGtLt(@Param("min") BigDecimal min, @Param("max") BigDecimal max);

    @Query("SELECT COUNT(t) FROM TalentProfile t WHERE t.deletedAt IS NULL AND (t.bonusScore IS NULL OR t.bonusScore = 0)")
    long countByBonusScoreNullOrZero();

    @Query(value = """
            SELECT TO_CHAR(DATE_TRUNC('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
                   COUNT(*) AS cnt
            FROM talent_profiles
            WHERE deleted_at IS NULL
              AND created_at >= NOW() - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')
            ORDER BY DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')
            """, nativeQuery = true)
    List<Object[]> countMonthlyNew();

    // ── 보고서 전용 ─────────────────────────────────────────────────────────────

    long countByAvailabilityStatusAndDeletedAtIsNull(AvailabilityStatus status);

    long countByCreatedAtAfterAndDeletedAtIsNull(java.time.OffsetDateTime since);

    @Query("SELECT AVG(t.desiredRate) FROM TalentProfile t WHERE t.deletedAt IS NULL AND t.desiredRate IS NOT NULL")
    Double avgDesiredRate();

    @Query(value = """
            SELECT TO_CHAR(DATE_TRUNC('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
                   COUNT(*) AS cnt
            FROM talent_profiles
            WHERE deleted_at IS NULL
              AND created_at >= :since
            GROUP BY DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')
            ORDER BY DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')
            """, nativeQuery = true)
    List<Object[]> countMonthlyNewSince(@Param("since") java.time.Instant since);

    @Query(value = """
            SELECT s.skill_name, COUNT(*) AS cnt
            FROM talent_skills s
            JOIN talent_profiles tp ON s.talent_id = tp.id
            WHERE tp.deleted_at IS NULL
            GROUP BY s.skill_name
            ORDER BY cnt DESC
            LIMIT 8
            """, nativeQuery = true)
    List<Object[]> topSkills();

    @Query("SELECT t.referralSource, COUNT(t) FROM TalentProfile t WHERE t.deletedAt IS NULL AND t.referralSource IS NOT NULL GROUP BY t.referralSource ORDER BY COUNT(t) DESC")
    List<Object[]> countByReferralSource();

    @Query(value = """
            SELECT
              CASE
                WHEN desired_rate < 300 THEN '300만 미만'
                WHEN desired_rate < 500 THEN '300~500만'
                WHEN desired_rate < 700 THEN '500~700만'
                WHEN desired_rate < 900 THEN '700~900만'
                ELSE '900만 이상'
              END AS band,
              CASE
                WHEN desired_rate < 300 THEN 1
                WHEN desired_rate < 500 THEN 2
                WHEN desired_rate < 700 THEN 3
                WHEN desired_rate < 900 THEN 4
                ELSE 5
              END AS band_order,
              COUNT(*) AS cnt
            FROM talent_profiles
            WHERE deleted_at IS NULL AND desired_rate IS NOT NULL
            GROUP BY band, band_order
            ORDER BY band_order
            """, nativeQuery = true)
    List<Object[]> countByRateBand();
}
