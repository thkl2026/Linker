package kr.co.linker.common.queue;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * 인메모리 AI 작업 큐 — On-Premise(local/onprem) 전용 구현체
 *
 * <p>Spring {@code @Async} + {@link LinkedBlockingQueue}로 비동기 작업을 처리한다.
 * Cloud 환경에서는 AWS SQS 구현체로 교체된다.
 *
 * <p>서버 재시작 시 큐에 남은 작업은 유실된다. On-Premise 운영 시 중요 작업은
 * 재시작 전 드레인(drain) 처리를 권장한다.
 *
 * @rule 그라운드룰 Rule 2: 구현체는 Profile로 주입, 서비스 레이어는 {@link AsyncJobQueue} 인터페이스만 의존
 */
@Component
@Profile({"local", "onprem"})
@Slf4j
@RequiredArgsConstructor
public class InMemoryAsyncJobQueue implements AsyncJobQueue {

    private final AiJobProcessor aiJobProcessor;
    private final BlockingQueue<AiJob> queue = new LinkedBlockingQueue<>(1000);

    /**
     * AI 작업을 큐에 발행한다.
     *
     * <p>큐 용량(1000) 초과 시 즉시 예외를 던진다 (서버 과부하 방지).
     *
     * @param job 처리할 AI 작업
     * @throws IllegalStateException 큐 용량 초과 시
     */
    @Override
    public void publish(AiJob job) {
        boolean offered = queue.offer(job);
        if (!offered) {
            log.error("[JOB_QUEUE_FULL] jobId={} type={}", job.jobId(), job.type());
            throw new IllegalStateException("AI 작업 큐가 가득 찼습니다. 잠시 후 다시 시도하세요.");
        }
        log.info("[JOB_PUBLISHED] jobId={} type={}", job.jobId(), job.type());
        processAsync(job);
    }

    /**
     * 비동기 AI 작업 처리 — Virtual Thread에서 실행됨
     *
     * @param job 처리할 작업
     */
    @Async
    public void processAsync(AiJob job) {
        aiJobProcessor.process(job);
    }
}
