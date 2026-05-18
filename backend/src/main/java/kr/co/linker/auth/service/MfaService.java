package kr.co.linker.auth.service;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import kr.co.linker.auth.dto.TotpSetupResponse;
import kr.co.linker.common.encryption.EncryptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * MFA(2단계 인증) 서비스 — TOTP QR 발급·검증 담당
 *
 * <p>Google Authenticator 호환 TOTP (RFC 6238) 구현.
 * TOTP 시드는 AES-256-GCM 암호화 후 DB 저장.
 *
 * @rule 그라운드룰 Rule 2: 발급자명은 {@code linker.mfa.totp-issuer} 설정에서 주입
 * @feature F-1 가입 흐름 3단계 — TOTP 설정
 */
@Service
@RequiredArgsConstructor
public class MfaService {

    @Value("${linker.mfa.totp-issuer}")
    private String totpIssuer;

    private final GoogleAuthenticator googleAuthenticator = new GoogleAuthenticator();
    private final EncryptionService encryptionService;

    /**
     * TOTP 시드 생성 및 QR URI 반환
     *
     * <p>시드는 AES-256-GCM 암호화하여 Redis에 임시 보관한다.
     * 검증 성공 후 DB에 저장.
     *
     * @param accountIdentifier QR 코드에 표시될 계정 식별자 (이메일 해시 사용)
     * @return QR URI + Base32 시드
     */
    public TotpSetupResponse generateTotpSetup(String accountIdentifier) {
        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        String secret = key.getKey();

        String otpAuthUri = buildOtpAuthUri(accountIdentifier, secret);
        // 실제 저장은 AuthService에서 Redis에 수행
        return new TotpSetupResponse(otpAuthUri, secret);
    }

    /**
     * TOTP OTP 코드 검증
     *
     * <p>암호화된 시드를 복호화한 후 구글 인증기 라이브러리로 검증한다.
     * 시간 오차 허용: ±1 타임스텝(30초) = 총 90초 허용
     *
     * @param encryptedSecret AES-256-GCM 암호화된 TOTP 시드
     * @param otpCode         사용자가 입력한 6자리 코드
     * @return 코드가 유효하면 true
     */
    public boolean verifyTotp(String encryptedSecret, String otpCode) {
        try {
            String secret = encryptionService.decrypt(encryptedSecret);
            int code = Integer.parseInt(otpCode);
            return googleAuthenticator.authorize(secret, code);
        } catch (Exception e) {
            return false;
        }
    }

    private String buildOtpAuthUri(String account, String secret) {
        String encodedIssuer = URLEncoder.encode(totpIssuer, StandardCharsets.UTF_8);
        String encodedAccount = URLEncoder.encode(account, StandardCharsets.UTF_8);
        return String.format(
                "otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
                encodedIssuer, encodedAccount, secret, encodedIssuer
        );
    }
}
