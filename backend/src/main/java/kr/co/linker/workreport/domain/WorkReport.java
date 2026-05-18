package kr.co.linker.workreport.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 주간 업무 보고 엔티티 (F-4.3)
 *
 * <p>TALENT가 주 단위로 업무 내용을 등록하면
 * AI가 리스크 수준·감정 분석·Red-flag를 자동 산출한다.
 */
@Entity
@Table(name = "work_reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkReport {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "contract_id", columnDefinition = "uuid")
    private UUID contractId;

    @Column(name = "talent_id", columnDefinition = "uuid")
    private UUID talentId;

    @Column(name = "report_week", nullable = false)
    private LocalDate reportWeek;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "ai_risk_level", length = 20)
    private String aiRiskLevel;

    @Column(name = "ai_risk_summary", columnDefinition = "TEXT")
    private String aiRiskSummary;

    @Column(name = "sentiment_score", precision = 3, scale = 2)
    private BigDecimal sentimentScore;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static WorkReport create(UUID contractId, UUID talentId,
                                    LocalDate reportWeek, String content) {
        WorkReport r = new WorkReport();
        r.id = UUID.randomUUID();
        r.contractId = contractId;
        r.talentId = talentId;
        r.reportWeek = reportWeek;
        r.content = content;
        return r;
    }

    public void attachAiAnalysis(String riskLevel, String riskSummary, BigDecimal sentimentScore) {
        this.aiRiskLevel = riskLevel;
        this.aiRiskSummary = riskSummary;
        this.sentimentScore = sentimentScore;
    }
}
