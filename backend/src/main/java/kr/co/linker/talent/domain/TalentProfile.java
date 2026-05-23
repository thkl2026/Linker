package kr.co.linker.talent.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * 인력 프로필 마스터 엔티티
 *
 * <p>AI 스코어는 {@code total_score} 컬럼이 DB GENERATED ALWAYS 컬럼이므로
 * JPA에서 직접 쓰지 않고 읽기 전용으로 매핑한다.
 * 이메일·연락처는 AES-256-GCM 암호화 저장, {@code email_hash}로 중복 검색.
 *
 * @feature F-1.2 가용 상태 관리, F-1.3 AI 스코어링
 */
@Entity
@Table(name = "talent_profiles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TalentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID userId;

    private UUID companyId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 100)
    private String nameEn;

    /** 이메일 — AES-256-GCM 암호화 */
    private String email;

    /** 이메일 SHA-256 해시 */
    @Column(length = 64)
    private String emailHash;

    /** 연락처 — AES-256-GCM 암호화 */
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TalentCategory category;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private TalentField field;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AvailabilityStatus availabilityStatus = AvailabilityStatus.AVAILABLE;

    private LocalDate availableFrom;
    private LocalDate birthDate;
    
    @Column(length = 200)
    private String address;
    
    @Column(length = 50)
    private String skillGrade;

    /** 이력서 명기 IT 경력 (개월 수). null이면 최초 경력일 기준으로 프론트에서 산정 */
    private Integer itCareerMonths;

    /** AI 종합 분석 결과 JSON (직렬화 저장) */
    @Column(columnDefinition = "TEXT")
    private String aiInsightJson;

    /** AI 분석 시 사용한 집중 키워드 */
    @Column(length = 500)
    private String aiInsightKeywords;

    /** 이력서에서 추출한 증명사진 MinIO 키 */
    @Column(length = 500)
    private String photoKey;

    /** 원본 이력서 파일 MinIO 키 */
    @Column(length = 500)
    private String resumeKey;

    @Column(length = 50)
    private String title;

    @Column(length = 100)
    private String projectRole;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /** 산업군 경험 — 콤마 구분 (예: "금융,공공,제조") */
    @Column(columnDefinition = "TEXT")
    private String industryExperience;

    /** 추천소스 (예: 지인추천, 공고, 헤드헌팅) */
    @Column(length = 100)
    private String referralSource;

    private BigDecimal desiredRate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private WorkType workType = WorkType.REMOTE;

    /** Soft Delete */
    private OffsetDateTime deletedAt;

    // ── AI 스코어 (F-1.3) ───────────────────────────────────────────────────
    @Column(precision = 5, scale = 2)
    private BigDecimal skillScore = BigDecimal.ZERO;

    @Column(precision = 5, scale = 2)
    private BigDecimal reliabilityScore = BigDecimal.ZERO;

    @Column(precision = 5, scale = 2)
    private BigDecimal performanceScore = BigDecimal.ZERO;

    /** 보너스 점수 (0~10점 상한) */
    @Column(precision = 5, scale = 2)
    private BigDecimal bonusScore = BigDecimal.ZERO;

    /**
     * total_score — DB GENERATED ALWAYS 컬럼. JPA는 읽기 전용으로 매핑.
     * 직접 set 금지.
     */
    @Column(insertable = false, updatable = false, precision = 5, scale = 2)
    private BigDecimal totalScore;

    @Column(insertable = false, updatable = false)
    private Boolean isNewTalent;

    @OneToMany(mappedBy = "talentProfile", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TalentSkill> skills = new ArrayList<>();

    @CreationTimestamp
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    // ── 팩토리 메서드 ────────────────────────────────────────────────────────

    /**
     * 신규 인력 프로필 생성
     *
     * @param userId    연결된 사용자 UUID
     * @param name      표시 이름
     * @param workType  희망 근무 형태
     */
    public static TalentProfile create(UUID userId, String name,
                                       TalentCategory category, TalentField field,
                                       WorkType workType) {
        TalentProfile profile = new TalentProfile();
        profile.userId = userId;
        profile.name = name;
        profile.category = category;
        profile.field = field;
        profile.workType = workType;
        return profile;
    }

    public void updatePhone(String encryptedPhone) {
        this.phone = encryptedPhone;
    }

    // ── 도메인 메서드 ────────────────────────────────────────────────────────

    /**
     * 가용 상태 변경 (F-1.2)
     *
     * @param status        변경할 상태
     * @param availableFrom BUSY→AVAILABLE 전환 예정일 (AVAILABLE 시 null)
     */
    public void updateAvailability(AvailabilityStatus status, LocalDate availableFrom) {
        this.availabilityStatus = status;
        this.availableFrom = availableFrom;
    }

    /**
     * 프로필 기본 정보 수정
     *
     * @param name         표시 이름
     * @param desiredRate  희망 단가
     * @param workType     희망 근무 형태
     */
    public void updateProfile(String name, String nameEn, BigDecimal desiredRate,
                              TalentCategory category, TalentField field,
                              WorkType workType,
                              LocalDate birthDate, String email, String address,
                              String title, String projectRole) {
        this.name = name;
        this.nameEn = nameEn;
        this.desiredRate = desiredRate;
        this.category = category;
        this.field = field;
        this.workType = workType;
        this.birthDate = birthDate;
        this.email = email;
        this.address = address;
        this.title = title;
        this.projectRole = projectRole;
    }

    public void updateSkillGrade(String grade) {
        this.skillGrade = grade;
    }

    /**
     * AI 스코어 업데이트 (F-1.3)
     *
     * <p>total_score는 DB 생성 컬럼이므로 직접 설정하지 않는다.
     *
     * @param skillScore       기술 숙련도 (0~100)
     * @param reliabilityScore 신뢰도 (0~100)
     * @param bonusScore       보너스 (0~10)
     */
    public void updateScore(BigDecimal skillScore, BigDecimal reliabilityScore, BigDecimal bonusScore) {
        this.skillScore = skillScore != null ? skillScore : BigDecimal.ZERO;
        this.reliabilityScore = reliabilityScore != null ? reliabilityScore : BigDecimal.ZERO;
        this.bonusScore = bonusScore != null ? bonusScore : BigDecimal.ZERO;
    }

    public void updateBonusScore(BigDecimal bonusScore) {
        this.bonusScore = bonusScore != null ? bonusScore : BigDecimal.ZERO;
    }

    public void updateNotes(String notes) {
        this.notes = notes;
    }

    public void updateItCareerMonths(Integer itCareerMonths) {
        this.itCareerMonths = itCareerMonths;
    }

    public void updateAiInsight(String insightJson, String keywords) {
        this.aiInsightJson = insightJson;
        this.aiInsightKeywords = keywords;
    }

    public void updateIndustryAndReferral(String industryExperience, String referralSource) {
        this.industryExperience = industryExperience;
        this.referralSource = referralSource;
    }

    public void updatePhotoKey(String photoKey) {
        this.photoKey = photoKey;
    }

    public void updateResumeKey(String resumeKey) {
        this.resumeKey = resumeKey;
    }

    /** Soft Delete */
    public void delete() {
        this.deletedAt = OffsetDateTime.now();
    }

    /** 삭제 여부 */
    public boolean isDeleted() {
        return deletedAt != null;
    }
}
