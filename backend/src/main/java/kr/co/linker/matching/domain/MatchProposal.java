package kr.co.linker.matching.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * AI 매칭 제안 엔티티 (F-2.2)
 *
 * <p>pgvector 코사인 유사도로 후보 인력을 선별하고,
 * LLM이 매칭 이유·강점·우려사항·인터뷰 가이드를 생성한다.
 */
@Entity
@Table(name = "match_proposals")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MatchProposal {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID projectId;

    @Column(nullable = false)
    private UUID talentId;

    @Column(precision = 5, scale = 4)
    private BigDecimal similarityScore;

    @Column(columnDefinition = "TEXT")
    private String matchReason;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> strengths;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> concerns;

    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> interviewGuide;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProposalStatus status = ProposalStatus.PENDING;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    /**
     * 매칭 제안 생성
     *
     * @param projectId       프로젝트 UUID
     * @param talentId        인력 UUID
     * @param similarityScore 벡터 유사도 (0~1)
     * @param matchReason     AI 매칭 이유
     * @param strengths       강점 목록
     * @param concerns        우려사항 목록
     * @param interviewGuide  인터뷰 질문 목록
     * @return 매칭 제안 엔티티
     */
    public static MatchProposal create(UUID projectId, UUID talentId, BigDecimal similarityScore,
                                       String matchReason, List<String> strengths,
                                       List<String> concerns, List<String> interviewGuide) {
        MatchProposal mp = new MatchProposal();
        mp.projectId = projectId;
        mp.talentId = talentId;
        mp.similarityScore = similarityScore;
        mp.matchReason = matchReason;
        mp.strengths = strengths;
        mp.concerns = concerns;
        mp.interviewGuide = interviewGuide;
        return mp;
    }

    /**
     * 제안 수락
     */
    public void accept() {
        this.status = ProposalStatus.ACCEPTED;
    }

    /**
     * 제안 거절
     */
    public void reject() {
        this.status = ProposalStatus.REJECTED;
    }
}
