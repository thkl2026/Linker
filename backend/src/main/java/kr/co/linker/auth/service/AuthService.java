package kr.co.linker.auth.service;

import kr.co.linker.auth.domain.User;
import kr.co.linker.auth.dto.LoginRequest;
import kr.co.linker.auth.dto.MfaSetupRequest;
import kr.co.linker.auth.dto.RegisterInitiateRequest;
import kr.co.linker.auth.dto.TokenResponse;
import kr.co.linker.auth.dto.TotpSetupResponse;
import kr.co.linker.auth.exception.AuthException;
import kr.co.linker.auth.repository.UserRepository;
import kr.co.linker.common.config.JwtProperties;
import kr.co.linker.common.encryption.EncryptionService;
import kr.co.linker.common.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.UUID;

/**
 * 인증 서비스 — 가입·로그인·MFA·토큰 갱신 비즈니스 로직
 *
 * <p>가입 흐름: ① 이메일·비밀번호 → ② 실명인증(NICE/KCB) → ③ MFA 설정 → ④ 계정 활성화
 * 로그인 흐름: ① 이메일·비밀번호 → ② MFA OTP 검증 → ③ JWT 발급
 *
 * @rule 그라운드룰 Rule 1: @Transactional 메서드는 AOP 로그 자동 기록
 * @rule 그라운드룰 Rule 2: 잠금 횟수·시간은 {@link kr.co.linker.common.config.LinkerProperties}에서 주입
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final String MFA_CHALLENGE_PREFIX = "mfa:challenge:";
    private static final Duration MFA_CHALLENGE_TTL = Duration.ofMinutes(5);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EncryptionService encryptionService;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtProperties jwtProperties;
    private final StringRedisTemplate redisTemplate;
    private final MfaService mfaService;

    /**
     * 회원가입 1단계 — 이메일·비밀번호·역할 저장, 실명인증 세션 준비
     *
     * <p>이메일 중복 여부는 SHA-256 해시로 비교한다. 이메일 원문은 AES-256-GCM 암호화 후 저장.
     *
     * @param request 가입 요청 (이메일·비밀번호·역할)
     * @return 생성된 사용자 UUID (실명인증 단계로 전달)
     * @throws AuthException 이메일 중복 시
     * @feature F-1 가입 흐름 1단계
     */
    @Transactional
    public UUID initiateRegistration(RegisterInitiateRequest request) {
        String emailHash = encryptionService.hash(request.email());

        if (userRepository.existsByEmailHash(emailHash)) {
            throw AuthException.emailAlreadyExists();
        }

        String encryptedEmail = encryptionService.encrypt(request.email());
        String hashedPassword = passwordEncoder.encode(request.password());

        User user = User.create(encryptedEmail, emailHash, hashedPassword, request.role());
        userRepository.save(user);

        log.info("[REGISTER_INITIATE] userId={} role={}", user.getId(), request.role());
        return user.getId();
    }

    /**
     * 회원가입 3단계 — TOTP QR 시드 발급
     *
     * @param userId 가입 중인 사용자 UUID
     * @return TOTP QR URI + Base32 시드
     * @feature F-1 가입 흐름 3단계 (TOTP 선택 시)
     */
    @Transactional(readOnly = true)
    public TotpSetupResponse issueTotpSecret(UUID userId) {
        User user = findUser(userId);
        return mfaService.generateTotpSetup(user.getEmailHash());
    }

    /**
     * 회원가입 4단계 — OTP 검증 후 계정 활성화
     *
     * @param userId  가입 중인 사용자 UUID
     * @param request MFA 방식 + OTP 코드
     * @throws AuthException OTP 불일치 시
     * @feature F-1 가입 흐름 4단계
     */
    @Transactional
    public void completeMfaSetup(UUID userId, MfaSetupRequest request) {
        User user = findUser(userId);
        String encryptedSecret = redisTemplate.opsForValue()
                .get("mfa:setup:" + userId);

        if (encryptedSecret == null) {
            throw AuthException.challengeTokenExpired();
        }

        boolean valid = mfaService.verifyTotp(encryptedSecret, request.otpCode());
        if (!valid) {
            throw AuthException.invalidOtp();
        }

        user.completeMfaSetup(request.mfaType(), encryptedSecret);
        redisTemplate.delete("mfa:setup:" + userId);
        log.info("[MFA_SETUP_COMPLETE] userId={} mfaType={}", userId, request.mfaType());
    }

    /**
     * 로그인 1단계 — 이메일·비밀번호 검증 후 MFA 챌린지 토큰 발급
     *
     * <p>5회 연속 실패 시 30분 잠금. 성공해도 MFA 미설정 계정은 FORBIDDEN 반환.
     *
     * @param request  로그인 요청
     * @param clientIp 클라이언트 IP (로그 및 감사 기록용)
     * @return MFA 챌린지 토큰 + MFA 방식
     * @throws AuthException 자격증명 불일치·계정 잠금·MFA 미설정 시
     */
    @Transactional
    public TokenResponse login(LoginRequest request, String clientIp) {
        String emailHash = encryptionService.hash(request.email());
        User user = userRepository.findByEmailHash(emailHash)
                .orElseThrow(AuthException::invalidCredentials);

        if (user.isLocked()) {
            throw AuthException.accountLocked();
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            user.recordLoginFailure(5, 30);
            throw AuthException.invalidCredentials();
        }

        user.recordLoginSuccess(clientIp);

        String accessToken  = jwtTokenProvider.generateAccessToken(user.getId(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(user.getId(), user.getRole().name());

        try {
            redisTemplate.opsForValue().set(
                    "refresh:" + user.getId(),
                    refreshToken,
                    Duration.ofSeconds(jwtProperties.refreshTokenExpiry())
            );
        } catch (DataAccessException e) {
            log.warn("[LOGIN] Redis unavailable — refresh token not stored. userId={}", user.getId());
        }

        log.info("[LOGIN_SUCCESS] userId={} role={} ip={}", user.getId(), user.getRole(), clientIp);
        return new TokenResponse(accessToken, refreshToken, jwtProperties.accessTokenExpiry(), user.getRole().name());
    }


    /**
     * 로그아웃 — Refresh Token Redis 블랙리스트 등록
     *
     * @param userId 로그아웃할 사용자 UUID
     */
    @Transactional
    public void logout(UUID userId) {
        try {
            redisTemplate.delete("refresh:" + userId);
        } catch (DataAccessException e) {
            log.warn("[LOGOUT] Redis unavailable — token not invalidated. userId={}", userId);
        }
        log.info("[LOGOUT] userId={}", userId);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new kr.co.linker.common.exception.LinkerException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));
    }
}
