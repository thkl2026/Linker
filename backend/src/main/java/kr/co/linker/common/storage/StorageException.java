package kr.co.linker.common.storage;

/**
 * 파일 저장소 조작 실패 예외
 */
public class StorageException extends RuntimeException {

    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
