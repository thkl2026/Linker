package kr.co.linker.auth.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * 사용자 계정 엔티티 — 전체 역할(TALENT/PM/PROCUREMENT/ADMIN) 공통.
 *
 * <p>이메일·연락처·실명·TOTP 시드는 {@link kr.co.linker.common.encryption.EncryptionService}로
 * AES-256-GCM 암호화 후 저장한다. DB에는 암호문만 보관된다.
 * 중복 체크·검색은 {@code email_hash}, {@code phone_hash} 컬럼(SHA-256)으로 수행한다.
 *
 * @rule 그라운드룰 Rule 2: 역할은 {@link UserRole} Enum, MFA 방식은 {@link MfaType} Enum
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@ToString(exclude = {"passwordHash", "mfaSecret", "mfaBackupCodes"})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** OAuth/SSO 연동 ID (선택) */
    @Column(unique = true)
    private String externalId;

    /** 이메일 — AES-256-GCM 암호화 저장 */
    @Column(nullable = false)
    private String email;

    /** 이메일 SHA-256 해시 — 중복 가입 체크 및 검색용 */
    @Column(unique = true, nullable = false, length = 64)
    private String emailHash;

    /** BCrypt 해시 비밀번호 (소셜 로그인 시 null) */
    private String passwordHash;

    /** 실명 — AES-256-GCM 암호화 (NICE/KCB 인증 실명) */
    private String realName;

    /** 연락처 — AES-256-GCM 암호화 */
    private String phone;

    /** 연락처 SHA-256 해시 */
    @Column(length = 64)
    private String phoneHash;

    private boolean identityVerified = false;
    private OffsetDateTime identityVerifiedAt;

    // ── 2단계 인증 ──────────────────────────────────────────────────────────
    private boolean mfaEnabled = false;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private MfaType mfaType;

    /** TOTP 시드 — AES-256-GCM 암호화 */
    private String mfaSecret;

    /** 일회용 백업 코드 해시 배열 (JSONB) */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> mfaBackupCodes;

    // ── 계정 상태 ────────────────────────────────────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserRole role;

    @Column(length = 100)
    private String department;

    private boolean isActive = true;

    /** 로그인 연속 실패 횟수 — 5회 초과 시 30분 잠금 */
    private int failedLoginCount = 0;

    /** 계정 잠금 만료 시각 */
    private OffsetDateTime lockedUntil;

    private OffsetDateTime passwordChangedAt;
    private OffsetDateTime lastLoginAt;

    @Column(length = 45)
    private String lastLoginIp;

    @CreationTimestamp
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    private OffsetDateTime updatedAt;

    // ── 팩토리 메서드 ────────────────────────────────────────────────────────

    /**
     * 신규 사용자 계정 생성 — 이메일·비밀번호 단계에서 임시 생성.
     * 실명인증·2FA 완료 전까지 identityVerified=false, mfaEnabled=false 상태.
     *
     * @param email        AES-256-GCM 암호화된 이메일
     * @param emailHash    이메일 SHA-256 해시
     * @param passwordHash BCrypt 해시 비밀번호
     * @param role         사용자 역할
     * @return 신규 User 인스턴스
     */
    public static User create(String email, String emailHash, String passwordHash, UserRole role) {
        User user = new User();
        user.email = email;
        user.emailHash = emailHash;
        user.passwordHash = passwordHash;
        user.role = role;
        return user;
    }

    // ── 도메인 메서드 ────────────────────────────────────────────────────────

    /**
     * 실명인증 완료 처리
     *
     * @param realName   AES-256-GCM 암호화된 실명
     * @param phone      AES-256-GCM 암호화된 연락처
     * @param phoneHash  연락처 SHA-256 해시
     */
    public void completeIdentityVerification(String realName, String phone, String phoneHash) {
        this.realName = realName;
        this.phone = phone;
        this.phoneHash = phoneHash;
        this.identityVerified = true;
        this.identityVerifiedAt = OffsetDateTime.now();
    }

    /**
     * TOTP 2FA 설정 완료 처리
     *
     * @param encryptedSecret AES-256-GCM 암호화된 TOTP 시드
     */
    public void completeMfaSetup(MfaType mfaType, String encryptedSecret) {
        this.mfaType = mfaType;
        this.mfaSecret = encryptedSecret;
        this.mfaEnabled = true;
    }

    /**
     * 로그인 실패 처리 — 5회 초과 시 30분 잠금
     *
     * @param maxAttempts  최대 허용 실패 횟수
     * @param lockMinutes  잠금 지속 시간 (분)
     */
    public void recordLoginFailure(int maxAttempts, int lockMinutes) {
        this.failedLoginCount++;
        if (this.failedLoginCount >= maxAttempts) {
            this.lockedUntil = OffsetDateTime.now().plusMinutes(lockMinutes);
        }
    }

    /** 로그인 성공 처리 — 실패 카운터 초기화 */
    public void recordLoginSuccess(String ipAddress) {
        this.failedLoginCount = 0;
        this.lockedUntil = null;
        this.lastLoginAt = OffsetDateTime.now();
        this.lastLoginIp = ipAddress;
    }

    /** 계정 잠금 여부 확인 */
    public boolean isLocked() {
        return lockedUntil != null && OffsetDateTime.now().isBefore(lockedUntil);
    }

    public void deactivate() {
        this.isActive = false;
    }

    public void activate() {
        this.isActive = true;
        this.failedLoginCount = 0;
        this.lockedUntil = null;
    }

    public void resetPassword(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
        this.passwordChangedAt = OffsetDateTime.now();
        this.failedLoginCount = 0;
        this.lockedUntil = null;
    }
}
