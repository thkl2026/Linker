package kr.co.linker.project.domain;

import jakarta.persistence.*;
import kr.co.linker.talent.domain.WorkType;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 프로젝트 기회 엔티티 — PM이 등록하는 사업 기회 및 매칭 요구사항
 *
 * <p>{@code required_skills}는 JSONB로 저장되며, AI 매칭(F-2.2)에서
 * {@code requirement_embedding} 벡터와 인력 프로필 벡터의 코사인 유사도를 계산한다.
 *
 * @feature F-2.1 프로젝트 등록, F-2.2 AI 인력 추천
 */
@Entity
@Table(name = "project_opportunities")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ProjectOpportunity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    /** 요구 기술 스택 — [{"skill":"Java","level":"senior"}] */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String requiredSkills;

    private BigDecimal budgetMin;
    private BigDecimal budgetMax;

    private LocalDate startDate;
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private WorkType workType = WorkType.REMOTE;

    /** 등록한 PM의 사용자 UUID */
    @Column(nullable = false)
    private UUID pmId;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private ProjectStatus status = ProjectStatus.OPEN;

    @Column(length = 200)
    private String clientCompany;

    @Column(length = 200)
    private String mainContractor;

    @Column(nullable = false)
    private int requiredHeadcount = 1;

    @Column(precision = 5, scale = 2)
    private BigDecimal evaluationScore;

    private OffsetDateTime evaluatedAt;

    @Column(columnDefinition = "TEXT")
    private String evaluationNote;

    // ── 수주 결과 정보 ──────────────────────────────────────────────────────────
    /** 수주 상태 — REVIEWING(검토중) / WON(수주확정) / LOST(실주) */
    @Column(length = 20)
    private String awardStatus;

    /** 수주(계약) 금액 */
    private BigDecimal awardAmount;

    /** 계약 체결일 */
    private LocalDate contractDate;

    /** 수주 비고 */
    @Column(columnDefinition = "TEXT")
    private String awardNote;

    /** 주사업자 담당자 정보 (이름/연락처/이메일 등 자유 입력) */
    @Column(length = 500)
    private String contractorContact;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    // ── 팩토리 메서드 ────────────────────────────────────────────────────────

    /**
     * 프로젝트 기회 생성 (F-2.1)
     *
     * @param pmId          등록 PM UUID
     * @param title         프로젝트 제목
     * @param description   상세 설명
     * @param requiredSkills 요구 기술 (JSONB 문자열)
     * @param budgetMin     예산 하한
     * @param budgetMax     예산 상한
     * @param workType      근무 형태
     */
    public static ProjectOpportunity create(UUID pmId, String title, String description,
                                             String requiredSkills, BigDecimal budgetMin,
                                             BigDecimal budgetMax, WorkType workType) {
        ProjectOpportunity project = new ProjectOpportunity();
        project.pmId = pmId;
        project.title = title;
        project.description = description;
        project.requiredSkills = requiredSkills;
        project.budgetMin = budgetMin;
        project.budgetMax = budgetMax;
        project.workType = workType;
        return project;
    }

    // ── 도메인 메서드 ────────────────────────────────────────────────────────

    /** 프로젝트 정보 수정 (OPEN 상태일 때만 허용) */
    public void update(String title, String description, BigDecimal budgetMin,
                       BigDecimal budgetMax, WorkType workType) {
        if (this.status != ProjectStatus.OPEN) {
            throw new IllegalStateException("OPEN 상태의 프로젝트만 수정할 수 있습니다.");
        }
        this.title = title;
        this.description = description;
        this.budgetMin = budgetMin;
        this.budgetMax = budgetMax;
        this.workType = workType;
    }

    /** 관리자 전체 수정 — 상태 무관 */
    public void adminUpdate(String title, String description, BigDecimal budgetMin,
                            BigDecimal budgetMax, WorkType workType) {
        this.title = title;
        this.description = description;
        this.budgetMin = budgetMin;
        this.budgetMax = budgetMax;
        this.workType = workType;
    }

    /** 매칭 완료 상태로 전환 */
    public void markMatched() {
        this.status = ProjectStatus.MATCHED;
    }

    /** 프로젝트 취소 */
    public void cancel() {
        this.status = ProjectStatus.CANCELLED;
    }

    public void changeStatus(ProjectStatus newStatus) {
        this.status = newStatus;
    }

    public void updateRequiredSkills(String requiredSkills) {
        this.requiredSkills = requiredSkills;
    }

    /** 관리자 메타 정보 수정 */
    public void updateAdminInfo(String clientCompany, String mainContractor, int requiredHeadcount,
                                LocalDate startDate, LocalDate endDate) {
        this.clientCompany = clientCompany;
        this.mainContractor = mainContractor;
        this.requiredHeadcount = requiredHeadcount;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    /** 수주 결과 정보 수정 */
    public void updateAwardInfo(String awardStatus, BigDecimal awardAmount, LocalDate contractDate,
                                String awardNote, String contractorContact) {
        this.awardStatus = awardStatus;
        this.awardAmount = awardAmount;
        this.contractDate = contractDate;
        this.awardNote = awardNote;
        this.contractorContact = contractorContact;
    }

    /** 평가 등록 */
    public void evaluate(BigDecimal score, String note) {
        this.evaluationScore = score;
        this.evaluationNote = note;
        this.evaluatedAt = OffsetDateTime.now();
    }

    /** 본인 프로젝트 여부 확인 */
    public boolean isOwnedBy(UUID userId) {
        return pmId.equals(userId);
    }
}
