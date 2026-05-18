package kr.co.linker.talent.dto;

import kr.co.linker.talent.domain.AiJobRecord;
import kr.co.linker.talent.domain.AiJobStatus;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * AI 작업 상태 조회 응답 DTO
 *
 * @param jobId      작업 UUID
 * @param status     현재 상태 (PENDING / PROCESSING / DONE / FAILED)
 * @param result     완료 시 결과 JSON (DONE일 때만 non-null)
 * @param errorMsg   실패 사유 (FAILED일 때만 non-null)
 * @param createdAt  작업 생성 시각
 */
public record JobStatusResponse(
        UUID jobId,
        AiJobStatus status,
        Map<String, Object> result,
        String errorMsg,
        OffsetDateTime createdAt
) {
    /**
     * 엔티티 → 응답 DTO 변환
     *
     * @param record AiJobRecord 엔티티
     * @return 응답 DTO
     */
    public static JobStatusResponse from(AiJobRecord record) {
        return new JobStatusResponse(
                record.getId(),
                record.getStatus(),
                record.getResult(),
                record.getErrorMsg(),
                record.getCreatedAt()
        );
    }
}
