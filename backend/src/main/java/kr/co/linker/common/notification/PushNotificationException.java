package kr.co.linker.common.notification;

/**
 * 푸시 알림 발송 실패 예외
 */
public class PushNotificationException extends RuntimeException {

    public PushNotificationException(String message, Throwable cause) {
        super(message, cause);
    }
}
