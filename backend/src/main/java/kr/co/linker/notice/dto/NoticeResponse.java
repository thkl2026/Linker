package kr.co.linker.notice.dto;

import kr.co.linker.notice.domain.Notice;

import java.time.LocalDateTime;
import java.util.UUID;

public record NoticeResponse(
        UUID id,
        String title,
        String content,
        String category,
        boolean pinned,
        boolean hidden,
        int viewCount,
        String authorName,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static NoticeResponse from(Notice n) {
        return new NoticeResponse(
                n.getId(), n.getTitle(), n.getContent(), n.getCategory(),
                n.isPinned(), n.isHidden(), n.getViewCount(), n.getAuthorName(),
                n.getCreatedAt(), n.getUpdatedAt()
        );
    }
}
