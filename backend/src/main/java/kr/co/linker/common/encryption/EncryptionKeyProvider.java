package kr.co.linker.common.encryption;

import javax.crypto.SecretKey;

/**
 * 암호화 키 제공자 추상화 인터페이스
 *
 * <p>On-Premise: {@code EnvEncryptionKeyProvider} (환경 변수 기반)
 * Cloud: {@code KmsEncryptionKeyProvider} (AWS KMS)
 *
 * @rule 그라운드룰 Rule 2: 키는 환경 변수 또는 KMS에서 주입, 코드에 하드코딩 금지
 */
public interface EncryptionKeyProvider {

    /**
     * 지정된 키 별칭에 해당하는 AES-256 SecretKey를 반환한다.
     *
     * @param keyAlias 키 별칭 (예: "default", "pii")
     * @return AES-256-GCM 용 SecretKey
     */
    SecretKey getAesKey(String keyAlias);
}
