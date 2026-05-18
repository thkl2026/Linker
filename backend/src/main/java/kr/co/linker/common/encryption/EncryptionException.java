package kr.co.linker.common.encryption;

/**
 * 암호화/복호화 실패 시 발생하는 런타임 예외
 */
public class EncryptionException extends RuntimeException {

    public EncryptionException(String message, Throwable cause) {
        super(message, cause);
    }
}
