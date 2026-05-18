package kr.co.linker.verification.domain;

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
 * 자가 증명 소스 이력 엔티티 (F-1.7)
 *
 * <p>GitHub/블로그/오픈소스 활동을 분석해 bonus_score를 부여한다.
 * self_certifications 테이블에 매핑.
 */
@Entity
@Table(name = "self_certifications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SelfCertification {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "talent_id", nullable = false, columnDefinition = "uuid")
    private UUID talentId;

    @Column(name = "source_type", nullable = false, length = 30)
    private String sourceType;   // GITHUB | BLOG | OPENSOURCE

    @Column(name = "source_url", nullable = false, length = 500)
    private String sourceUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "analysis_result")
    private Map<String, Object> analysisResult;

    @Column(name = "bonus_score", precision = 5, scale = 2)
    private BigDecimal bonusScore;

    @Column(name = "analyzed_at", insertable = false, updatable = false)
    private OffsetDateTime analyzedAt;

    /**
     * 자가 증명 레코드를 생성한다.
     *
     * @param talentId       인력 UUID
     * @param sourceType     소스 유형
     * @param sourceUrl      소스 URL
     * @param analysisResult AI 분석 결과
     * @param bonusScore     부여 가점 (0~10)
     * @return 자가 증명 인스턴스
     */
    public static SelfCertification create(UUID talentId, String sourceType,
                                            String sourceUrl,
                                            Map<String, Object> analysisResult,
                                            BigDecimal bonusScore) {
        SelfCertification sc = new SelfCertification();
        sc.id = UUID.randomUUID();
        sc.talentId = talentId;
        sc.sourceType = sourceType;
        sc.sourceUrl = sourceUrl;
        sc.analysisResult = analysisResult;
        sc.bonusScore = bonusScore;
        return sc;
    }
}
