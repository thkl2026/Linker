package kr.co.linker.talent.repository;

import kr.co.linker.talent.domain.AvailabilityStatus;
import kr.co.linker.talent.domain.TalentCategory;
import kr.co.linker.talent.domain.TalentField;
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

    Page<TalentProfile> findAllByDeletedAtIsNull(Pageable pageable);

    long countByDeletedAtIsNull();

    /**
     * 통합 검색: 이름 또는 기술스택명 포함, category/field 필터 (null 이면 전체)
     */
    @Query("""
            SELECT DISTINCT t FROM TalentProfile t
            LEFT JOIN t.skills s
            WHERE t.deletedAt IS NULL
              AND (:keyword IS NULL OR
                   LOWER(t.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(s.skillName) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:category IS NULL OR t.category = :category)
              AND (:field IS NULL OR t.field = :field)
            """)
    Page<TalentProfile> search(
            @Param("keyword") String keyword,
            @Param("category") TalentCategory category,
            @Param("field") TalentField field,
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

    @Query("SELECT t.skillGrade, COUNT(t) FROM TalentProfile t WHERE t.deletedAt IS NULL AND t.skillGrade IS NOT NULL GROUP BY t.skillGrade ORDER BY COUNT(t) DESC")
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
}
