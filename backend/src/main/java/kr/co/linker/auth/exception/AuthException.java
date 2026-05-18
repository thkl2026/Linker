package kr.co.linker.auth.exception;

import kr.co.linker.common.exception.LinkerException;
import org.springframework.http.HttpStatus;

/**
 * 인증 도메인 예외 — 로그인 실패·계정 잠금·MFA 관련 오류
 */
public class AuthException extends LinkerException {

    private AuthException(HttpStatus status, String errorCode, String message) {
        super(status, errorCode, message);
    }

    /** 이메일 또는 비밀번호 불일치 */
    public static AuthException invalidCredentials() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    /** 계정 잠금 */
    public static AuthException accountLocked() {
        return new AuthException(HttpStatus.LOCKED, "ACCOUNT_LOCKED", "로그인 실패 횟수 초과로 계정이 잠겼습니다. 30분 후 다시 시도하세요.");
    }

    /** 이메일 중복 */
    public static AuthException emailAlreadyExists() {
        return new AuthException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "이미 사용 중인 이메일입니다.");
    }

    /** MFA 설정 미완료 — 로그인 차단 */
    public static AuthException mfaRequired() {
        return new AuthException(HttpStatus.FORBIDDEN, "MFA_REQUIRED", "2단계 인증 설정이 필요합니다.");
    }

    /** OTP 코드 불일치 */
    public static AuthException invalidOtp() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "INVALID_OTP", "OTP 코드가 올바르지 않습니다.");
    }

    /** MFA 챌린지 토큰 만료 또는 없음 */
    public static AuthException challengeTokenExpired() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "CHALLENGE_TOKEN_EXPIRED", "인증 세션이 만료되었습니다. 다시 로그인하세요.");
    }

    /** 실명인증 미완료 */
    public static AuthException identityVerificationRequired() {
        return new AuthException(HttpStatus.FORBIDDEN, "IDENTITY_VERIFICATION_REQUIRED", "실명인증이 필요합니다.");
    }
}
