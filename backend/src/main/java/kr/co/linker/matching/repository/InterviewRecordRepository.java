package kr.co.linker.matching.repository;

import kr.co.linker.matching.domain.InterviewRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/**
 * 인터뷰 기록 Repository
 */
public interface InterviewRecordRepository extends JpaRepository<InterviewRecord, UUID> {

    /**
     * 매칭 제안별 인터뷰 기록 조회 (일정 오름차순)
     *
     * @param proposalId 매칭 제안 UUID
     * @return 인터뷰 기록 목록
     */
    List<InterviewRecord> findByProposalIdOrderByScheduledAtAsc(UUID proposalId);
}
