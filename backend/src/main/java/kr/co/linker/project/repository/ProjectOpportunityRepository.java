package kr.co.linker.project.repository;

import kr.co.linker.project.domain.ProjectOpportunity;
import kr.co.linker.project.domain.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * 프로젝트 기회 Repository
 */
public interface ProjectOpportunityRepository extends JpaRepository<ProjectOpportunity, UUID> {

    /**
     * PM이 등록한 프로젝트 목록 조회
     *
     * @param pmId     PM 사용자 UUID
     * @param pageable 페이지네이션
     * @return 프로젝트 페이지
     */
    Page<ProjectOpportunity> findByPmIdOrderByCreatedAtDesc(UUID pmId, Pageable pageable);

    /**
     * 특정 상태의 공개 프로젝트 목록 조회
     *
     * @param status   조회할 상태
     * @param pageable 페이지네이션
     * @return 프로젝트 페이지
     */
    Page<ProjectOpportunity> findByStatusOrderByCreatedAtDesc(ProjectStatus status, Pageable pageable);

    long countByStatus(ProjectStatus status);

    @Query("""
            SELECT p FROM ProjectOpportunity p
            WHERE (:keyword IS NULL OR
                   LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(p.clientCompany) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(p.mainContractor) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND p.status = :status
            ORDER BY p.createdAt DESC
            """)
    Page<ProjectOpportunity> searchAll(
            @Param("keyword") String keyword,
            @Param("status") ProjectStatus status,
            Pageable pageable
    );

    @Query("""
            SELECT p FROM ProjectOpportunity p
            WHERE (:keyword IS NULL OR
                   LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(p.clientCompany) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
                   LOWER(p.mainContractor) LIKE LOWER(CONCAT('%', :keyword, '%')))
            ORDER BY p.createdAt DESC
            """)
    Page<ProjectOpportunity> searchAllNoStatus(
            @Param("keyword") String keyword,
            Pageable pageable
    );

    // ── 평가 관리 ──────────────────────────────────────────────────────────────

    long countByStatusIn(Collection<ProjectStatus> statuses);

    long countByStatusInAndEvaluatedAtIsNull(Collection<ProjectStatus> statuses);

    @Query("SELECT AVG(p.evaluationScore) FROM ProjectOpportunity p WHERE p.evaluationScore IS NOT NULL")
    Double avgEvaluationScore();

    @Query("SELECT COUNT(p) FROM ProjectOpportunity p WHERE p.evaluationScore >= :score")
    long countByEvaluationScoreGe(@Param("score") BigDecimal score);

    @Query("SELECT COUNT(p) FROM ProjectOpportunity p WHERE p.evaluatedAt >= :since")
    long countEvaluatedSince(@Param("since") OffsetDateTime since);

    // keyword 있을 때
    @Query("""
            SELECT p FROM ProjectOpportunity p
            WHERE p.status IN :statuses
              AND LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            ORDER BY p.evaluatedAt ASC, p.endDate ASC
            """)
    Page<ProjectOpportunity> searchForEvaluationAllByKeyword(
            @Param("statuses") Collection<ProjectStatus> statuses,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    // keyword 없을 때
    @Query("SELECT p FROM ProjectOpportunity p WHERE p.status IN :statuses ORDER BY p.evaluatedAt ASC, p.endDate ASC")
    Page<ProjectOpportunity> findAllForEvaluation(
            @Param("statuses") Collection<ProjectStatus> statuses,
            Pageable pageable
    );

    @Query("""
            SELECT p FROM ProjectOpportunity p
            WHERE p.status IN :statuses
              AND p.evaluatedAt IS NOT NULL
              AND LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            ORDER BY p.evaluatedAt DESC
            """)
    Page<ProjectOpportunity> searchForEvaluationDoneByKeyword(
            @Param("statuses") Collection<ProjectStatus> statuses,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("SELECT p FROM ProjectOpportunity p WHERE p.status IN :statuses AND p.evaluatedAt IS NOT NULL ORDER BY p.evaluatedAt DESC")
    Page<ProjectOpportunity> findAllForEvaluationDone(
            @Param("statuses") Collection<ProjectStatus> statuses,
            Pageable pageable
    );

    @Query("""
            SELECT p FROM ProjectOpportunity p
            WHERE p.status IN :statuses
              AND p.evaluatedAt IS NULL
              AND LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
            ORDER BY p.endDate ASC
            """)
    Page<ProjectOpportunity> searchForEvaluationPendingByKeyword(
            @Param("statuses") Collection<ProjectStatus> statuses,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query("SELECT p FROM ProjectOpportunity p WHERE p.status IN :statuses AND p.evaluatedAt IS NULL ORDER BY p.endDate ASC")
    Page<ProjectOpportunity> findAllForEvaluationPending(
            @Param("statuses") Collection<ProjectStatus> statuses,
            Pageable pageable
    );

    // ── 보고서 전용 ─────────────────────────────────────────────────────────────

    @Query("SELECT AVG(p.requiredHeadcount) FROM ProjectOpportunity p")
    Double avgRequiredHeadcount();

    @Query(value = """
            SELECT p.client_company, COUNT(*) AS cnt,
                   COALESCE(AVG(p.evaluation_score), 0) AS avg_score
            FROM project_opportunities p
            WHERE p.client_company IS NOT NULL AND p.client_company <> ''
            GROUP BY p.client_company
            ORDER BY cnt DESC
            LIMIT 10
            """, nativeQuery = true)
    List<Object[]> topClientsByCount();

    @Query(value = """
            SELECT p.work_type, COUNT(*) AS cnt
            FROM project_opportunities p
            GROUP BY p.work_type
            ORDER BY cnt DESC
            """, nativeQuery = true)
    List<Object[]> countByWorkType();

    @Query(value = """
            SELECT TO_CHAR(DATE_TRUNC('month', created_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
                   COUNT(*) FILTER (WHERE status <> 'CANCELLED') AS opened,
                   COUNT(*) FILTER (WHERE status = 'CLOSED') AS closed_count
            FROM project_opportunities
            WHERE created_at >= :since
            GROUP BY DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')
            ORDER BY DATE_TRUNC('month', created_at AT TIME ZONE 'UTC')
            """, nativeQuery = true)
    List<Object[]> countMonthlyOpenClosed(@Param("since") java.time.Instant since);
}
