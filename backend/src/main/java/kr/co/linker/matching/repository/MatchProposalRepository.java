package kr.co.linker.matching.repository;

import kr.co.linker.matching.domain.MatchProposal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * 매칭 제안 Repository
 *
 * <p>pgvector 유사도 검색은 네이티브 쿼리로 구현한다.
 */
public interface MatchProposalRepository extends JpaRepository<MatchProposal, UUID> {

    /**
     * 프로젝트별 매칭 제안 목록 (유사도 점수 내림차순)
     *
     * @param projectId 프로젝트 UUID
     * @param pageable  페이지네이션
     * @return 제안 페이지
     */
    Page<MatchProposal> findByProjectIdOrderBySimilarityScoreDesc(UUID projectId, Pageable pageable);

    /**
     * 인력 UUID + 프로젝트 UUID로 중복 제안 확인
     *
     * @param projectId 프로젝트 UUID
     * @param talentId  인력 UUID
     * @return 기존 제안 (있으면)
     */
    Optional<MatchProposal> findByProjectIdAndTalentId(UUID projectId, UUID talentId);

    /**
     * pgvector 코사인 유사도 기반 상위 N개 인력 검색
     *
     * <p>프로젝트 임베딩과 인력 임베딩의 코사인 거리가 가장 작은(유사도 높은) 인력을 반환한다.
     *
     * @param projectEmbedding 프로젝트 요구사항 임베딩 (vector 형식 문자열)
     * @param limit            최대 반환 수
     * @return [talentId, similarityScore] 쌍 목록
     */
    @Query(value = """
            SELECT tp.id::text                                         AS talent_id,
                   1 - (tp.profile_embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM talent_profiles tp
            WHERE tp.deleted_at IS NULL
              AND tp.profile_embedding IS NOT NULL
              AND tp.availability_status = 'AVAILABLE'
            ORDER BY tp.profile_embedding <=> CAST(:embedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findTopSimilarTalents(@Param("embedding") String projectEmbedding,
                                          @Param("limit") int limit);
}
