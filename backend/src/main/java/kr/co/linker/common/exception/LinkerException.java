package kr.co.linker.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Linker 도메인 비즈니스 예외 기본 클래스
 *
 * <p>각 도메인에서 이 클래스를 상속하여 구체적인 예외를 정의한다.
 * HTTP 상태 코드와 도메인 오류 코드를 함께 전달하여 클라이언트가 처리할 수 있게 한다.
 */
public class LinkerException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    /**
     * @param status    HTTP 응답 상태 코드
     * @param errorCode 클라이언트 식별용 오류 코드 (예: TALENT_NOT_FOUND)
     * @param message   사용자에게 노출될 오류 메시지
     */
    public LinkerException(HttpStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
