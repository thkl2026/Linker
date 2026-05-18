package kr.co.linker.notice.service;

import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.notice.domain.Notice;
import kr.co.linker.notice.dto.CreateNoticeRequest;
import kr.co.linker.notice.dto.NoticeResponse;
import kr.co.linker.notice.dto.UpdateNoticeRequest;
import kr.co.linker.notice.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NoticeService {

    private final NoticeRepository repo;

    @Transactional(readOnly = true)
    public Page<NoticeResponse> list(String category, String keyword, Pageable pageable) {
        String cat = (category == null || category.isBlank()) ? null : category;
        String kw  = (keyword  == null || keyword.isBlank())  ? null : keyword;
        return repo.search(cat, kw, pageable).map(NoticeResponse::from);
    }

    @Transactional
    public NoticeResponse getById(UUID id) {
        Notice n = require(id);
        n.incrementViewCount();
        return NoticeResponse.from(n);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public NoticeResponse create(CreateNoticeRequest req) {
        Notice n = Notice.create(req.title(), req.content(), req.category(), req.pinned(), req.authorName());
        repo.save(n);
        log.info("[NOTICE] 공지 등록 id={} title={}", n.getId(), n.getTitle());
        return NoticeResponse.from(n);
    }

    @Transactional
    public NoticeResponse update(UUID id, UpdateNoticeRequest req) {
        Notice n = require(id);
        n.update(req.title(), req.content(), req.category(), req.pinned());
        log.info("[NOTICE] 공지 수정 id={}", id);
        return NoticeResponse.from(n);
    }

    @Transactional
    public void delete(UUID id) {
        Notice n = require(id);
        repo.delete(n);
        log.info("[NOTICE] 공지 삭제 id={}", id);
    }

    @Transactional
    public void toggleHidden(UUID id) {
        Notice n = require(id);
        n.toggleHidden();
        log.info("[NOTICE] 숨기기 토글 id={} hidden={}", id, n.isHidden());
    }

    @Transactional
    public void togglePinned(UUID id) {
        Notice n = require(id);
        n.togglePinned();
        log.info("[NOTICE] 고정 토글 id={} pinned={}", id, n.isPinned());
    }

    @Transactional(readOnly = true)
    public long countTotal()   { return repo.count(); }
    @Transactional(readOnly = true)
    public long countPinned()  { return repo.countByPinnedTrue(); }
    @Transactional(readOnly = true)
    public long countThisMonth() {
        return repo.countByCreatedAtAfter(LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0));
    }

    private Notice require(UUID id) {
        return repo.findById(id)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "NOTICE_NOT_FOUND", "공지사항을 찾을 수 없습니다."));
    }
}
