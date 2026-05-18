package kr.co.linker.common.exception;

import kr.co.linker.common.notification.PushNotificationException;
import kr.co.linker.common.scan.ScanException;
import kr.co.linker.common.storage.StorageException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 전역 예외 처리기 — RFC 9457 ProblemDetail 형식으로 오류 응답을 통일한다.
 *
 * @rule 그라운드룰 Rule 1: 예외 발생 시 타임스탬프 포함 로그 기록
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * 입력값 유효성 검사 실패 처리 (400)
     *
     * @param ex {@link MethodArgumentNotValidException}
     * @return 필드별 오류 메시지가 포함된 ProblemDetail
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage,
                        (a, b) -> a));

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "입력값 유효성 검사 실패");
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("fieldErrors", errors);
        return problem;
    }

    /**
     * 도메인 비즈니스 예외 처리 (400/404/409 등)
     *
     * @param ex {@link LinkerException}
     * @return 도메인 오류 코드가 포함된 ProblemDetail
     */
    @ExceptionHandler(LinkerException.class)
    public ProblemDetail handleLinkerException(LinkerException ex) {
        log.warn("[DOMAIN_ERROR] code={} message={}", ex.getErrorCode(), ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getStatus(), ex.getMessage());
        problem.setProperty("timestamp", Instant.now());
        problem.setProperty("errorCode", ex.getErrorCode());
        return problem;
    }

    /**
     * 인증 실패 처리 (401)
     */
    @ExceptionHandler(AuthenticationException.class)
    public ProblemDetail handleAuthentication(AuthenticationException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, "인증이 필요합니다.");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * 권한 부족 처리 (403)
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "접근 권한이 없습니다.");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * 파일 저장소 오류 처리 (502)
     */
    @ExceptionHandler(StorageException.class)
    public ProblemDetail handleStorage(StorageException ex) {
        log.error("[STORAGE_ERROR] {}", ex.getMessage(), ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_GATEWAY, "파일 저장소 오류가 발생했습니다.");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * 바이러스 스캔 오류 처리 (502)
     */
    @ExceptionHandler(ScanException.class)
    public ProblemDetail handleScan(ScanException ex) {
        log.error("[SCAN_ERROR] {}", ex.getMessage(), ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_GATEWAY, "바이러스 스캔 서비스 오류가 발생했습니다.");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * 푸시 알림 발송 오류 처리 (502)
     */
    @ExceptionHandler(PushNotificationException.class)
    public ProblemDetail handlePushNotification(PushNotificationException ex) {
        log.error("[PUSH_ERROR] {}", ex.getMessage(), ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_GATEWAY, "푸시 알림 서비스 오류가 발생했습니다.");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * 그 외 처리되지 않은 예외 (500)
     *
     * @param ex 발생한 예외
     * @return 내부 서버 오류 응답 (상세 오류 숨김)
     */
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleUnexpected(Exception ex) {
        log.error("[UNEXPECTED_ERROR] {}", ex.getMessage(), ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }
}
