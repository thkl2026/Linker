package kr.co.linker.project.repository;

import kr.co.linker.project.domain.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {
    List<ProjectMember> findByProjectId(UUID projectId);
    boolean existsByProjectIdAndTalentId(UUID projectId, UUID talentId);

    /** 월별 투입 단가 합계 (매출 근사치) */
    @Query(value = """
            SELECT TO_CHAR(DATE_TRUNC('month', pm.assigned_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
                   COALESCE(SUM(tp.desired_rate), 0) AS total
            FROM project_members pm
            JOIN talent_profiles tp ON pm.talent_id = tp.id
            WHERE tp.deleted_at IS NULL
              AND pm.assigned_at >= :since
            GROUP BY DATE_TRUNC('month', pm.assigned_at AT TIME ZONE 'UTC')
            ORDER BY DATE_TRUNC('month', pm.assigned_at AT TIME ZONE 'UTC')
            """, nativeQuery = true)
    List<Object[]> monthlyRevenue(@Param("since") java.time.Instant since);
}
