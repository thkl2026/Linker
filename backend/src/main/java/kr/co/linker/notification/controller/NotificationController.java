package kr.co.linker.notification.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.linker.notification.dto.NotificationResponse;
import kr.co.linker.notification.service.NotificationService;
import kr.co.linker.notification.service.SseEmitterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@Tag(name = "Notification", description = "알림 API")
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final SseEmitterRegistry sseEmitterRegistry;
    private final NotificationService notificationService;

    @Operation(summary = "SSE 알림 스트림 구독")
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public SseEmitter stream(@AuthenticationPrincipal UUID userId) {
        return sseEmitterRegistry.subscribe(userId);
    }

    @Operation(summary = "최근 알림 5개 조회")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<NotificationResponse> getRecent() {
        return notificationService.getRecent5();
    }

    @Operation(summary = "알림 읽음 처리")
    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markRead(@PathVariable UUID id) {
        notificationService.markRead(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "전체 알림 읽음 처리")
    @PatchMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markAllRead() {
        notificationService.markAllRead();
        return ResponseEntity.noContent().build();
    }
}
