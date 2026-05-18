package kr.co.linker.common.encryption;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM 암호화 서비스 — 개인정보 컬럼(이메일·연락처·실명 등) 암호화에 사용
 *
 * <p>GCM 모드로 인증 태그가 포함되어 변조 감지가 가능하다.
 * IV는 매 암호화마다 랜덤 생성되며 암호문 앞에 붙여 저장된다.
 *
 * @rule 그라운드룰 Rule 2: 키는 {@link EncryptionKeyProvider}를 통해 주입받음
 */
@Service
@RequiredArgsConstructor
public class EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    private static final String HASH_ALGORITHM = "SHA-256";

    private final EncryptionKeyProvider keyProvider;

    /**
     * 평문을 AES-256-GCM으로 암호화한 후 Base64 인코딩된 문자열을 반환한다.
     *
     * <p>반환 형식: Base64(IV(12bytes) + CipherText + AuthTag)
     *
     * @param plainText 암호화할 평문
     * @return Base64 인코딩된 암호문 (IV 포함)
     */
    public String encrypt(String plainText) {
        try {
            SecretKey key = keyProvider.getAesKey("default");
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] cipherText = cipher.doFinal(plainText.getBytes());

            byte[] result = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, result, 0, iv.length);
            System.arraycopy(cipherText, 0, result, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(result);
        } catch (Exception e) {
            throw new EncryptionException("암호화 실패", e);
        }
    }

    /**
     * Base64 인코딩된 암호문을 복호화하여 평문을 반환한다.
     *
     * @param encryptedText Base64 인코딩된 암호문
     * @return 복호화된 평문
     */
    public String decrypt(String encryptedText) {
        try {
            SecretKey key = keyProvider.getAesKey("default");
            byte[] decoded = Base64.getDecoder().decode(encryptedText);

            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(decoded, 0, iv, 0, iv.length);

            byte[] cipherText = new byte[decoded.length - iv.length];
            System.arraycopy(decoded, iv.length, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            return new String(cipher.doFinal(cipherText));
        } catch (Exception e) {
            throw new EncryptionException("복호화 실패", e);
        }
    }

    /**
     * 암호화된 필드의 중복 체크용 SHA-256 해시를 생성한다.
     *
     * <p>이메일·연락처 중복 가입 방지를 위해 암호화된 원본 필드와 함께 저장된다.
     * 검색 시 해시 비교로 평문 노출 없이 중복을 확인한다.
     *
     * @param plainText 해시할 평문
     * @return 소문자 HEX 64자리 SHA-256 해시
     */
    public String hash(String plainText) {
        try {
            MessageDigest digest = MessageDigest.getInstance(HASH_ALGORITHM);
            byte[] hashBytes = digest.digest(plainText.toLowerCase().trim().getBytes());
            StringBuilder sb = new StringBuilder();
            for (byte b : hashBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new EncryptionException("해시 생성 실패", e);
        }
    }
}
