package kr.co.linker.auth.dto;

/**
 * TOTP 설정 응답 — QR코드 URI와 수동 입력용 시드 반환
 *
 * @param otpAuthUri  Google Authenticator QR 코드 URI (otpauth://totp/...)
 * @param secretKey   수동 입력용 Base32 시드 (QR 스캔 불가 시)
 */
public record TotpSetupResponse(
        String otpAuthUri,
        String secretKey
) {}
