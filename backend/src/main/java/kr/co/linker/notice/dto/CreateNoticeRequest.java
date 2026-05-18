package kr.co.linker.notice.dto;

public record CreateNoticeRequest(
        String title,
        String content,
        String category,
        boolean pinned,
        String authorName
) {}
