package kr.co.linker.common.encryption;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.HexFormat;

/**
 * 환경 변수 기반 AES-256 키 제공자 — On-Premise(local/onprem) 전용 구현체
 *
 * <p>암호화 키는 {@code ENCRYPTION_KEY} 환경 변수에서 64자리 HEX 문자열로 주입된다.
 * Cloud 환경에서는 AWS KMS 구현체로 교체된다.
 *
 * @rule 그라운드룰 Rule 2: 키는 환경 변수에서 주입, 코드 내 하드코딩 절대 금지
 */
@Component
@Profile({"local", "onprem"})
public class EnvEncryptionKeyProvider implements EncryptionKeyProvider {

    private final SecretKey aesKey;

    /**
     * @param encryptionKeyHex 64자리 HEX 문자열 AES-256 키 (환경 변수 {@code ENCRYPTION_KEY})
     */
    public EnvEncryptionKeyProvider(@Value("${linker.encryption.key}") String encryptionKeyHex) {
        byte[] keyBytes = HexFormat.of().parseHex(encryptionKeyHex);
        if (keyBytes.length != 32) {
            throw new IllegalArgumentException("ENCRYPTION_KEY는 64자리 HEX(32바이트)여야 합니다.");
        }
        this.aesKey = new SecretKeySpec(keyBytes, "AES");
    }

    /**
     * AES-256 SecretKey 반환 — On-Premise 환경에서는 모든 keyAlias에 동일한 키를 반환한다.
     *
     * <p>Cloud 전환 후 AWS KMS 구현체는 keyAlias별로 다른 키를 반환할 수 있다.
     *
     * @param keyAlias 키 별칭 (현재 미사용, Cloud 전환 시 활용)
     * @return AES-256-GCM 용 SecretKey
     */
    @Override
    public SecretKey getAesKey(String keyAlias) {
        return aesKey;
    }
}
