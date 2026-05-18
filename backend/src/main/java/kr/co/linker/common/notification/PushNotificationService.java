package kr.co.linker.common.notification;

import java.util.List;
import java.util.UUID;

/**
 * 푸시 알림 발송 추상화 인터페이스
 *
 * <p>On-Premise / Local: {@code FcmPushNotificationService} (Firebase Cloud Messaging)
 * 구현체는 Spring Profile로 주입된다.
 *
 * @rule 그라운드룰 Rule 2: FCM 자격증명은 env var에서 주입
 */
public interface PushNotificationService {

    /**
     * 단일 디바이스에 푸시 알림을 발송한다.
     *
     * @param token   FCM 디바이스 토큰
     * @param payload 알림 내용
     */
    void sendToDevice(String token, NotificationPayload payload);

    /**
     * 특정 사용자의 모든 디바이스에 푸시 알림을 발송한다.
     *
     * @param userId  수신자 사용자 UUID
     * @param payload 알림 내용
     */
    void sendToUser(UUID userId, NotificationPayload payload);

    /**
     * 복수 디바이스에 일괄 발송한다 (최대 500개).
     *
     * @param tokens  FCM 디바이스 토큰 목록
     * @param payload 알림 내용
     */
    void sendMulticast(List<String> tokens, NotificationPayload payload);

    /**
     * 푸시 알림 페이로드
     *
     * @param title 알림 제목
     * @param body  알림 본문
     * @param data  추가 데이터 (딥링크, 타입 등)
     */
    record NotificationPayload(String title, String body, java.util.Map<String, String> data) {

        /** 제목·본문만 있는 단순 알림 생성 */
        public static NotificationPayload simple(String title, String body) {
            return new NotificationPayload(title, body, java.util.Map.of());
        }
    }
}
