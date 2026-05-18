package kr.co.linker.common.notification;

import com.google.firebase.messaging.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Firebase Cloud Messaging 푸시 알림 구현체
 *
 * <p>단건 발송 → {@link FirebaseMessaging#send}
 * 멀티캐스트 → {@link FirebaseMessaging#sendEachForMulticast} (최대 500 토큰)
 * 사용자별 발송은 Phase 2에서 디바이스 토큰 조회 로직 추가 예정.
 */
@Slf4j
@Service
@Profile({"local", "onprem", "cloud"})
@ConditionalOnBean(com.google.firebase.FirebaseApp.class)
@RequiredArgsConstructor
public class FcmPushNotificationService implements PushNotificationService {

    @Override
    public void sendToDevice(String token, NotificationPayload payload) {
        Message message = buildMessage(token, payload);
        try {
            String messageId = FirebaseMessaging.getInstance().send(message);
            log.info("[FCM_SENT] token={} messageId={}", maskToken(token), messageId);
        } catch (FirebaseMessagingException e) {
            log.error("[FCM_SEND_FAILED] token={} error={}", maskToken(token), e.getMessage());
            throw new PushNotificationException("FCM 발송 실패", e);
        }
    }

    @Override
    public void sendToUser(UUID userId, NotificationPayload payload) {
        // Phase 2: device_tokens 테이블에서 userId로 토큰 조회 후 sendMulticast 호출
        log.warn("[FCM_USER_SEND_STUB] userId={} — Phase 2에서 디바이스 토큰 조회 구현 예정", userId);
    }

    @Override
    public void sendMulticast(List<String> tokens, NotificationPayload payload) {
        if (tokens.isEmpty()) {
            return;
        }
        MulticastMessage message = MulticastMessage.builder()
                .addAllTokens(tokens)
                .setNotification(Notification.builder()
                        .setTitle(payload.title())
                        .setBody(payload.body())
                        .build())
                .putAllData(payload.data())
                .build();
        try {
            BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
            log.info("[FCM_MULTICAST] total={} success={} failure={}",
                    tokens.size(), response.getSuccessCount(), response.getFailureCount());
        } catch (FirebaseMessagingException e) {
            log.error("[FCM_MULTICAST_FAILED] error={}", e.getMessage());
            throw new PushNotificationException("FCM 멀티캐스트 발송 실패", e);
        }
    }

    private Message buildMessage(String token, NotificationPayload payload) {
        return Message.builder()
                .setToken(token)
                .setNotification(Notification.builder()
                        .setTitle(payload.title())
                        .setBody(payload.body())
                        .build())
                .putAllData(payload.data())
                .build();
    }

    /** 로그에서 토큰 일부만 표시 */
    private String maskToken(String token) {
        return token.length() > 8 ? token.substring(0, 8) + "..." : "***";
    }
}
