package kr.co.linker.common.queue;

import java.util.Map;
import java.util.UUID;

/**
 * AI 비동기 작업 메시지 — 큐에 발행되는 단위 작업 데이터
 *
 * @param jobId   작업 고유 ID (클라이언트 폴링용)
 * @param type    작업 종류 ({@link AiJobType})
 * @param payload 작업별 추가 데이터
 * @rule 그라운드룰 Rule 2: 하드코딩 금지 (type은 Enum으로 관리)
 */
public record AiJob(
        UUID jobId,
        AiJobType type,
        Map<String, Object> payload
) {
    /**
     * AI 작업 종류 Enum
     */
    public enum AiJobType {
        RESUME_PARSE,       // 이력서 파싱 + 임베딩 생성 (F-1.1)
        SCORE_RECALCULATE,  // 스코어 재계산 (F-1.3)
        HISTORY_VALIDATE,   // 이력 검증 (F-1.5)
        MATCH_PROPOSALS,    // AI 매칭 제안 생성 (F-2.2)
        PRICE_ANALYSIS      // 단가 분석 (F-3.2)
    }
}
