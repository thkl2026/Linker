package kr.co.linker.common.aop;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * 트랜잭션 로깅 AOP — 모든 {@code @Transactional} 메서드에 자동 적용
 *
 * <p>시작 시각·종료 시각·소요 시간(ms)·성공 여부를 JSON 구조 로그로 기록한다.
 * 실패 시 오류 코드와 스택 트레이스를 함께 출력한다.
 *
 * @rule 그라운드룰 Rule 1: 타임스탬프 포함 트랜잭션 로그
 */
@Aspect
@Component
@Slf4j
public class TransactionLoggingAspect {

    /**
     * {@code @Transactional} 어노테이션이 붙은 모든 메서드를 대상으로
     * 시작·종료 시각, 소요 시간, 성공/실패 여부를 로그로 기록한다.
     *
     * @param joinPoint 실행 대상 메서드 정보
     * @return 원본 메서드 반환값
     * @throws Throwable 원본 예외를 그대로 전파 (로그 기록 후 재던짐)
     */
    @Around("@annotation(org.springframework.transaction.annotation.Transactional)")
    public Object logTransaction(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        String method = joinPoint.getSignature().toShortString();

        log.info("[TX_START] method={} timestamp={}", method, Instant.now());
        try {
            Object result = joinPoint.proceed();
            log.info("[TX_SUCCESS] method={} durationMs={}", method, System.currentTimeMillis() - start);
            return result;
        } catch (Throwable e) {
            log.error("[TX_FAIL] method={} durationMs={} error={}",
                    method, System.currentTimeMillis() - start, e.getMessage(), e);
            throw e;
        }
    }
}
