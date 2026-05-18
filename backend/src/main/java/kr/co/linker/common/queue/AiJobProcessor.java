package kr.co.linker.common.queue;

import kr.co.linker.notification.service.SseEmitterRegistry;
import kr.co.linker.talent.domain.AiJobRecord;
import kr.co.linker.talent.repository.AiJobRepository;
import kr.co.linker.talent.repository.TalentProfileRepository;
import kr.co.linker.talent.service.EmbeddingService;
import kr.co.linker.talent.service.HistoryValidationService;
import kr.co.linker.talent.service.ResumeParseService;
import kr.co.linker.talent.service.TalentScoringService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * AI 비동기 작업 처리기
 *
 * <p>{@link AsyncJobQueue}에서 발행된 {@link AiJob}을 수신하여 작업 유형별로 처리를 위임한다.
 * Virtual Thread(@Async) 위에서 실행되어 I/O 블로킹을 효율적으로 처리한다.
 *
 * @rule 그라운드룰 Rule 1: 작업 시작·완료·실패 시 타임스탬프 로그 기록
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiJobProcessor {

    private final AiJobRepository aiJobRepository;
    private final TalentProfileRepository talentProfileRepository;
    private final ResumeParseService resumeParseService;
    private final EmbeddingService embeddingService;
    private final TalentScoringService talentScoringService;
    private final HistoryValidationService historyValidationService;
    private final SseEmitterRegistry sseEmitterRegistry;

    /**
     * AI 작업을 처리한다.
     *
     * <p>작업 상태를 PROCESSING → DONE/FAILED로 전환하며, 실패 시 errorMsg를 기록한다.
     *
     * @param job 처리할 AI 작업
     */
    @Transactional
    public void process(AiJob job) {
        UUID jobRecordId = UUID.fromString((String) job.payload().get("jobRecordId"));
        AiJobRecord record = aiJobRepository.findById(jobRecordId).orElse(null);
        if (record == null) {
            log.warn("[JOB_RECORD_NOT_FOUND] jobId={}", job.jobId());
            return;
        }

        record.markProcessing();
        log.info("[JOB_START] jobId={} type={}", job.jobId(), job.type());
        long startMs = System.currentTimeMillis();

        try {
            Map<String, Object> result = switch (job.type()) {
                case RESUME_PARSE -> processResumeParse(job);
                case SCORE_RECALCULATE -> processScoring(job);
                case HISTORY_VALIDATE -> processHistoryValidate(job);
                default -> Map.of("status", "NOT_IMPLEMENTED", "type", job.type().name());
            };
            record.markDone(result);
            long durationMs = System.currentTimeMillis() - startMs;
            log.info("[JOB_DONE] jobId={} type={} durationMs={}", job.jobId(), job.type(), durationMs);

            // 인력 소유 사용자에게 SSE 완료 이벤트 발송
            if (record.getTalentId() != null) {
                talentProfileRepository.findById(record.getTalentId()).ifPresent(p ->
                        sseEmitterRegistry.send(p.getUserId(), "JOB_DONE",
                                Map.of("jobId", job.jobId(), "type", job.type(), "durationMs", durationMs))
                );
            }
        } catch (Exception e) {
            record.markFailed(e.getMessage());
            log.error("[JOB_FAILED] jobId={} type={} error={}", job.jobId(), job.type(), e.getMessage(), e);
        }
    }

    private Map<String, Object> processResumeParse(AiJob job) {
        String fileKey = (String) job.payload().get("fileKey");
        UUID talentId = UUID.fromString((String) job.payload().get("talentId"));

        Map<String, Object> parseResult = resumeParseService.parse(fileKey);

        // 파싱 완료 후 임베딩 생성
        var profileOpt = talentProfileRepository.findById(talentId);
        profileOpt.ifPresent(profile -> {
            String profileText = embeddingService.buildProfileText(profile);
            embeddingService.updateEmbedding(talentId, profileText);
        });

        // 스코어링도 연쇄 실행
        talentScoringService.recalculate(talentId);

        return parseResult;
    }

    private Map<String, Object> processScoring(AiJob job) {
        UUID talentId = UUID.fromString((String) job.payload().get("talentId"));
        return talentScoringService.recalculate(talentId);
    }

    private Map<String, Object> processHistoryValidate(AiJob job) {
        UUID talentId = UUID.fromString((String) job.payload().get("talentId"));
        return historyValidationService.validate(talentId);
    }
}
