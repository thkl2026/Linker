package kr.co.linker.chat.dto;

/**
 * WebSocket 채팅 메시지 DTO (F-6.2)
 *
 * @param sessionId 세션 ID (클라이언트 생성 UUID)
 * @param role      메시지 역할 — USER | ASSISTANT
 * @param content   메시지 본문
 */
public record ChatMessage(
        String sessionId,
        String role,
        String content
) {}
