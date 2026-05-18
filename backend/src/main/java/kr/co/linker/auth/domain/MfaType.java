package kr.co.linker.auth.domain;

/**
 * 2단계 인증 방식 Enum
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
public enum MfaType {
    /** Google Authenticator 등 TOTP 앱 */
    TOTP,
    /** SMS OTP */
    SMS
}
