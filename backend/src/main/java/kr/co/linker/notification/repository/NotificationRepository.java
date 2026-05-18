package kr.co.linker.notification.repository;

import kr.co.linker.notification.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findTop5ByOrderByCreatedAtDesc();
}
