package kr.co.linker.verification.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * 이력 외부 검증 로그 엔티티 (F-1.6)
 *
 * <p>학력·자격증·프로젝트 실존성을 외부 API(GitHub, 학사정보시스템 stub)로 검증하고
 * 결과를 기록한다. verification_logs 테이블에 매핑.
 */
@Entity
@Table(name = "verification_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VerificationLog {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "experience_id", columnDefinition = "uuid")
    private UUID experienceId;

    @Column(name = "verification_type", nullable = false, length = 50)
    private String verificationType;   // ACADEMIC | CERTIFICATE | PROJECT_EXISTENCE

    @Column(length = 100)
    private String source;             // GITHUB_API | ACADEMIC_STUB | MANUAL

    @Column(length = 30)
    private String result;             // PASSED | FAILED | MANUAL_REQUIRED

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> detail;

    @Column(name = "verified_at", insertable = false, updatable = false)
    private OffsetDateTime verifiedAt;

    /**
     * 검증 로그를 생성한다.
     *
     * @param experienceId     이력 UUID
     * @param verificationType 검증 유형
     * @param source           검증 소스
     * @param result           검증 결과
     * @param detail           상세 정보 (JSON)
     * @return 검증 로그 인스턴스
     */
    public static VerificationLog create(UUID experienceId, String verificationType,
                                         String source, String result,
                                         Map<String, Object> detail) {
        VerificationLog log = new VerificationLog();
        log.id = UUID.randomUUID();
        log.experienceId = experienceId;
        log.verificationType = verificationType;
        log.source = source;
        log.result = result;
        log.detail = detail;
        return log;
    }
}
