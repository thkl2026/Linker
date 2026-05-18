package kr.co.linker.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 로그인 2단계 요청 DTO — MFA 챌린지 토큰 + OTP 코드
 *
 * @param mfaChallengeToken 1단계 로그인 성공 시 발급된 임시 챌린지 토큰
 * @param otpCode           6자리 OTP 코드
 */
public record MfaVerifyRequest(
        @NotBlank String mfaChallengeToken,

        @NotBlank
        @Pattern(regexp = "^\\d{6}$", message = "6자리 숫자 코드를 입력하세요.")
        String otpCode
) {}
