package kr.co.linker.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SSE Emitter 레지스트리 — 사용자별 구독 관리
 *
 * <p>AI 작업 완료, 매칭 제안, 리스크 알림 등 서버 → 클라이언트 실시간 푸시에 사용한다.
 */
@Component
@Slf4j
public class SseEmitterRegistry {

    private static final long SSE_TIMEOUT_MS = 30 * 60 * 1000L; // 30분
    private final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();

    /**
     * 사용자 SSE 연결을 등록하고 Emitter를 반환한다.
     *
     * @param userId 사용자 UUID
     * @return SseEmitter (클라이언트 연결 유지용)
     */
    public SseEmitter subscribe(UUID userId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        emitters.put(userId, emitter);

        emitter.onCompletion(() -> {
            emitters.remove(userId);
            log.debug("[SSE_DISCONNECTED] userId={}", userId);
        });
        emitter.onTimeout(() -> {
            emitters.remove(userId);
            log.debug("[SSE_TIMEOUT] userId={}", userId);
        });
        emitter.onError((e) -> emitters.remove(userId));

        log.info("[SSE_SUBSCRIBED] userId={}", userId);
        return emitter;
    }

    /**
     * 특정 사용자에게 SSE 이벤트를 발송한다.
     *
     * @param userId    수신자 UUID
     * @param eventName 이벤트 이름 (e.g. "JOB_DONE", "PROPOSAL_RECEIVED")
     * @param data      전송할 데이터
     */
    public void send(UUID userId, String eventName, Object data) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) { return; }
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
            log.debug("[SSE_SENT] userId={} event={}", userId, eventName);
        } catch (IOException e) {
            emitters.remove(userId);
            log.warn("[SSE_SEND_FAILED] userId={} reason={}", userId, e.getMessage());
        }
    }

    /**
     * 현재 구독 중인 사용자 수
     *
     * @return 구독자 수
     */
    public int subscriberCount() {
        return emitters.size();
    }
}
