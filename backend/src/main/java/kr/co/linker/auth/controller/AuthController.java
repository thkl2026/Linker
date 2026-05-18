package kr.co.linker.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import kr.co.linker.auth.dto.*;
import kr.co.linker.auth.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * 인증 API 컨트롤러 — 가입·로그인·MFA·토큰 관리
 *
 * <p>모든 엔드포인트는 {@code /api/v1/auth} 하위에 위치하며 인증 불필요(공개) 경로다.
 * 로그아웃만 인증 토큰 필요.
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "Auth", description = "인증·가입·MFA API")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 회원가입 1단계 — 이메일·비밀번호·역할 등록
     *
     * @param request 가입 요청 (이메일, 비밀번호, 역할)
     * @return 생성된 사용자 UUID (이후 단계로 전달)
     */
    @Operation(summary = "회원가입 1단계: 이메일·비밀번호 등록")
    @PostMapping("/register/initiate")
    public ResponseEntity<UUID> initiateRegistration(@Valid @RequestBody RegisterInitiateRequest request) {
        UUID userId = authService.initiateRegistration(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(userId);
    }

    /**
     * 회원가입 3단계 — TOTP QR 시드 발급
     *
     * @param userId 가입 진행 중인 사용자 UUID
     * @return QR URI + Base32 시드
     */
    @Operation(summary = "회원가입 3단계: TOTP QR 코드 발급")
    @PostMapping("/register/mfa-setup")
    public ResponseEntity<TotpSetupResponse> issueTotpSecret(@RequestParam UUID userId) {
        return ResponseEntity.ok(authService.issueTotpSecret(userId));
    }

    /**
     * 회원가입 4단계 — OTP 검증 후 계정 활성화
     *
     * @param userId  가입 진행 중인 사용자 UUID
     * @param request MFA 방식 + OTP 코드
     * @return 204 No Content
     */
    @Operation(summary = "회원가입 4단계: MFA 설정 완료")
    @PostMapping("/register/complete")
    public ResponseEntity<Void> completeMfaSetup(@RequestParam UUID userId,
                                                  @Valid @RequestBody MfaSetupRequest request) {
        authService.completeMfaSetup(userId, request);
        return ResponseEntity.noContent().build();
    }

    /**
     * 로그인 1단계 — 이메일·비밀번호 검증 후 MFA 챌린지 토큰 발급
     *
     * @param request    로그인 요청 (이메일, 비밀번호)
     * @param httpRequest 클라이언트 IP 추출용
     * @return MFA 챌린지 토큰 + MFA 방식
     */
    @Operation(summary = "로그인: 이메일·비밀번호 검증 후 JWT 발급")
    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request,
                                                HttpServletRequest httpRequest) {
        String clientIp = httpRequest.getRemoteAddr();
        return ResponseEntity.ok(authService.login(request, clientIp));
    }


    /**
     * 로그아웃 — Refresh Token 무효화
     *
     * @param userId 인증된 사용자 UUID (JWT에서 추출)
     * @return 204 No Content
     */
    @Operation(summary = "로그아웃: Refresh Token 무효화")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UUID userId) {
        authService.logout(userId);
        return ResponseEntity.noContent().build();
    }
}
