package kr.co.linker.notice.dto;

public record UpdateNoticeRequest(
        String title,
        String content,
        String category,
        boolean pinned
) {}
