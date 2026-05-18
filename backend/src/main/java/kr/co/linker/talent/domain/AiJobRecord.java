package kr.co.linker.talent.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * AI 비동기 작업 상태 추적 엔티티
 *
 * <p>클라이언트는 jobId로 폴링하여 DONE/FAILED 여부를 확인한다.
 *
 * @feature F-1.1 이력서 파싱, F-1.3 스코어링, F-1.5 이력 검증
 */
@Entity
@Table(name = "ai_jobs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AiJobRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 30)
    private String type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AiJobStatus status = AiJobStatus.PENDING;

    @Column(name = "talent_id")
    private UUID talentId;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> payload;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> result;

    @Column(name = "error_msg")
    private String errorMsg;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    /**
     * 새 AI 작업 레코드 생성
     *
     * @param type     작업 유형 (AiJobType 이름)
     * @param talentId 연관 인력 UUID
     * @param payload  작업 입력 데이터
     */
    public static AiJobRecord create(String type, UUID talentId, Map<String, Object> payload) {
        AiJobRecord record = new AiJobRecord();
        record.type = type;
        record.talentId = talentId;
        record.payload = payload;
        return record;
    }

    /** 처리 시작 상태로 전환 */
    public void markProcessing() {
        this.status = AiJobStatus.PROCESSING;
    }

    /**
     * 완료 상태로 전환
     *
     * @param result AI 처리 결과 JSON
     */
    public void markDone(Map<String, Object> result) {
        this.status = AiJobStatus.DONE;
        this.result = result;
    }

    /**
     * 실패 상태로 전환
     *
     * @param errorMsg 실패 사유
     */
    public void markFailed(String errorMsg) {
        this.status = AiJobStatus.FAILED;
        this.errorMsg = errorMsg;
    }
}
