package kr.co.linker.talent.repository;

import kr.co.linker.talent.domain.AiJobRecord;
import kr.co.linker.talent.domain.AiJobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * AI 작업 상태 Repository
 */
public interface AiJobRepository extends JpaRepository<AiJobRecord, UUID> {

    /**
     * 인력 ID + 작업 유형으로 최신 작업 목록 조회
     *
     * @param talentId 인력 UUID
     * @param type     작업 유형
     * @return 작업 목록 (최신 순)
     */
    List<AiJobRecord> findByTalentIdAndTypeOrderByCreatedAtDesc(UUID talentId, String type);

    /**
     * 미완료 작업 조회 (재시작 복구용)
     *
     * @param status 조회할 상태
     * @return 해당 상태의 작업 목록
     */
    List<AiJobRecord> findByStatus(AiJobStatus status);
}
