package kr.co.linker.notification.service;

import kr.co.linker.notification.domain.Notification;
import kr.co.linker.notification.dto.NotificationResponse;
import kr.co.linker.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void create(String type, String title, String message) {
        notificationRepository.save(Notification.create(type, title, message));
        log.info("[NOTIFICATION] type={} title={}", type, title);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getRecent5() {
        return notificationRepository.findTop5ByOrderByCreatedAtDesc()
                .stream().map(NotificationResponse::from).toList();
    }

    @Transactional
    public void markRead(UUID id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.markRead();
            log.info("[NOTIFICATION] markRead id={}", id);
        });
    }

    @Transactional
    public void markAllRead() {
        notificationRepository.findAll().forEach(Notification::markRead);
    }
}
