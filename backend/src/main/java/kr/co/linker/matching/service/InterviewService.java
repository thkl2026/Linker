package kr.co.linker.matching.service;

import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.matching.domain.InterviewRecord;
import kr.co.linker.matching.dto.CreateInterviewRequest;
import kr.co.linker.matching.dto.RecordInterviewResultRequest;
import kr.co.linker.matching.repository.InterviewRecordRepository;
import kr.co.linker.matching.repository.MatchProposalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * 인터뷰 관리 서비스 (F-2.3)
 *
 * <p>매칭 제안 수락 후 인터뷰 일정 등록·결과 기록을 담당한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InterviewService {

    private final InterviewRecordRepository interviewRecordRepository;
    private final MatchProposalRepository matchProposalRepository;

    /**
     * 인터뷰 일정 등록
     *
     * @param proposalId 매칭 제안 UUID
     * @param request    일정 + 장소
     * @return 생성된 인터뷰 기록 UUID
     */
    @Transactional
    public UUID schedule(UUID proposalId, CreateInterviewRequest request) {
        if (!matchProposalRepository.existsById(proposalId)) {
            throw new LinkerException(HttpStatus.NOT_FOUND, "PROPOSAL_NOT_FOUND", "매칭 제안을 찾을 수 없습니다.");
        }
        InterviewRecord record = InterviewRecord.create(proposalId, request.scheduledAt(), request.location());
        interviewRecordRepository.save(record);
        log.info("[INTERVIEW_SCHEDULED] proposalId={} interviewId={}", proposalId, record.getId());
        return record.getId();
    }

    /**
     * 제안별 인터뷰 기록 목록 조회
     *
     * @param proposalId 매칭 제안 UUID
     * @return 인터뷰 기록 목록 (일정 오름차순)
     */
    @Transactional(readOnly = true)
    public List<InterviewRecord> listByProposal(UUID proposalId) {
        return interviewRecordRepository.findByProposalIdOrderByScheduledAtAsc(proposalId);
    }

    /**
     * 인터뷰 결과 기록
     *
     * @param interviewId 인터뷰 기록 UUID
     * @param request     결과 + 메모
     */
    @Transactional
    public void recordResult(UUID interviewId, RecordInterviewResultRequest request) {
        InterviewRecord record = interviewRecordRepository.findById(interviewId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "INTERVIEW_NOT_FOUND", "인터뷰 기록을 찾을 수 없습니다."));
        record.recordResult(request.result(), request.notes());
        log.info("[INTERVIEW_RESULT] interviewId={} result={}", interviewId, request.result());
    }
}
