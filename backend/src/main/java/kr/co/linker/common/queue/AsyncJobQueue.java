package kr.co.linker.common.queue;

/**
 * 비동기 AI 작업 큐 추상화 인터페이스
 *
 * <p>On-Premise: {@code InMemoryAsyncJobQueue} (Spring {@code @Async} + BlockingQueue)
 * Cloud: {@code SqsAsyncJobQueue} (AWS SQS)
 * 구현체는 Spring Profile로 주입된다.
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지 (구현체는 Profile로 주입)
 */
public interface AsyncJobQueue {

    /**
     * AI 처리 작업을 큐에 발행한다.
     *
     * <p>API 서버는 이 메서드 호출 후 즉시 202 Accepted 응답을 반환하고,
     * AI Worker가 비동기로 작업을 소비하여 처리한다.
     *
     * @param job 처리할 AI 작업 정보 (jobId, type, payload)
     */
    void publish(AiJob job);
}
