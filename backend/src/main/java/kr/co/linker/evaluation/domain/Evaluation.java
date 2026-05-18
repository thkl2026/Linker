package kr.co.linker.evaluation.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * 평가 엔티티 — PM/동료 평가 원문 + AI 구조화 결과 (F-4.2)
 */
@Entity
@Table(name = "evaluations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Evaluation {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "contract_id", columnDefinition = "uuid")
    private UUID contractId;

    @Column(name = "evaluator_id", nullable = false, columnDefinition = "uuid")
    private UUID evaluatorId;

    @Column(name = "evaluator_role", length = 20)
    private String evaluatorRole;

    @Column(name = "raw_feedback", columnDefinition = "TEXT")
    private String rawFeedback;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "structured_feedback", columnDefinition = "jsonb")
    private Map<String, Object> structuredFeedback;

    @Column(name = "trust_score", precision = 5, scale = 2)
    private BigDecimal trustScore;

    @Column(name = "system_log_match_rate", precision = 5, scale = 2)
    private BigDecimal systemLogMatchRate;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static Evaluation create(UUID contractId, UUID evaluatorId,
                                    String evaluatorRole, String rawFeedback) {
        Evaluation e = new Evaluation();
        e.id = UUID.randomUUID();
        e.contractId = contractId;
        e.evaluatorId = evaluatorId;
        e.evaluatorRole = evaluatorRole;
        e.rawFeedback = rawFeedback;
        return e;
    }

    public void attachStructured(Map<String, Object> structured, BigDecimal trustScore) {
        this.structuredFeedback = structured;
        this.trustScore = trustScore;
    }
}
