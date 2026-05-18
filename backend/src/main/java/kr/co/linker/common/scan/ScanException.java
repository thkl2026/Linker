package kr.co.linker.common.scan;

/**
 * 바이러스 스캔 실패 예외
 */
public class ScanException extends RuntimeException {

    public ScanException(String message, Throwable cause) {
        super(message, cause);
    }
}
