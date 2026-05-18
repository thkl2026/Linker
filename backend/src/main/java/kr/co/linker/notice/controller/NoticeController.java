package kr.co.linker.notice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.linker.notice.dto.CreateNoticeRequest;
import kr.co.linker.notice.dto.NoticeResponse;
import kr.co.linker.notice.dto.UpdateNoticeRequest;
import kr.co.linker.notice.service.NoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Tag(name = "Notice", description = "공지사항 API")
@RestController
@RequestMapping("/api/v1/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    @Operation(summary = "공지사항 목록 조회")
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Page<NoticeResponse> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return noticeService.list(category, keyword, pageable);
    }

    @Operation(summary = "공지사항 통계")
    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Long> stats() {
        return Map.of(
                "total",     noticeService.countTotal(),
                "pinned",    noticeService.countPinned(),
                "thisMonth", noticeService.countThisMonth()
        );
    }

    @Operation(summary = "공지사항 상세 조회 (조회수 증가)")
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public NoticeResponse getById(@PathVariable UUID id) {
        return noticeService.getById(id);
    }

    @Operation(summary = "공지사항 등록")
    @PostMapping
    @PreAuthorize("hasAnyRole('SERVICE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<NoticeResponse> create(@RequestBody CreateNoticeRequest req) {
        return ResponseEntity.ok(noticeService.create(req));
    }

    @Operation(summary = "공지사항 수정")
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SERVICE_ADMIN','SYSTEM_ADMIN')")
    public NoticeResponse update(@PathVariable UUID id, @RequestBody UpdateNoticeRequest req) {
        return noticeService.update(id, req);
    }

    @Operation(summary = "공지사항 삭제")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SERVICE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        noticeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "공지 숨기기/표시 토글")
    @PatchMapping("/{id}/hidden")
    @PreAuthorize("hasAnyRole('SERVICE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<Void> toggleHidden(@PathVariable UUID id) {
        noticeService.toggleHidden(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "공지 고정/해제 토글")
    @PatchMapping("/{id}/pinned")
    @PreAuthorize("hasAnyRole('SERVICE_ADMIN','SYSTEM_ADMIN')")
    public ResponseEntity<Void> togglePinned(@PathVariable UUID id) {
        noticeService.togglePinned(id);
        return ResponseEntity.noContent().build();
    }
}
