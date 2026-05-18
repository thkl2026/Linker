package kr.co.linker.notification.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications", indexes = @Index(name = "idx_notification_created", columnList = "created_at DESC"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String message;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static Notification create(String type, String title, String message) {
        Notification n = new Notification();
        n.type = type;
        n.title = title;
        n.message = message;
        n.isRead = false;
        n.createdAt = LocalDateTime.now();
        return n;
    }

    public void markRead() {
        this.isRead = true;
    }
}
