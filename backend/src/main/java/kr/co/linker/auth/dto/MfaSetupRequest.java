package kr.co.linker.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import kr.co.linker.auth.domain.MfaType;

/**
 * 2FA 설정 완료 요청 DTO — OTP 코드 검증
 *
 * @param mfaType    인증 방식 (TOTP | SMS)
 * @param otpCode    6자리 OTP 코드
 */
public record MfaSetupRequest(
        MfaType mfaType,

        @NotBlank
        @Pattern(regexp = "^\\d{6}$", message = "6자리 숫자 코드를 입력하세요.")
        String otpCode
) {}
