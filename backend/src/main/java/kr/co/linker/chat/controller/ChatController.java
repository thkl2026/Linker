package kr.co.linker.chat.controller;

import kr.co.linker.chat.dto.ChatMessage;
import kr.co.linker.chat.service.AiChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

/**
 * AI 챗 WebSocket 컨트롤러 (F-6.2)
 *
 * <p>클라이언트 발행: /app/chat.send
 * AI 응답 구독:   /user/topic/chat.reply
 * 세션 종료 발행: /app/chat.close
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final AiChatService aiChatService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 사용자 메시지를 수신하여 AI 응답을 반환한다.
     *
     * @param payload   클라이언트 메시지
     * @param principal 인증된 사용자 (username = userId)
     * @return AI 응답 메시지 (발신자에게만 전달)
     */
    @MessageMapping("/chat.send")
    @SendToUser("/topic/chat.reply")
    public ChatMessage handleMessage(@Payload ChatMessage payload, Principal principal) {
        UUID userId = UUID.fromString(principal.getName());

        String response = aiChatService.chat(
                payload.sessionId(), userId,
                principal.getName(),   // 실제 이름은 사용자 조회 후 사용 가능; 여기선 username 대용
                "USER",
                payload.content()
        );

        return new ChatMessage(payload.sessionId(), "ASSISTANT", response);
    }

    /**
     * 세션 종료를 처리한다 — 대화 이력을 DB에 저장한다.
     *
     * @param payload   종료 메시지 (content 무시, sessionId만 사용)
     * @param principal 인증된 사용자
     */
    @MessageMapping("/chat.close")
    public void closeSession(@Payload ChatMessage payload, Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        aiChatService.closeSession(payload.sessionId(), userId);
        messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/topic/chat.reply",
                new ChatMessage(payload.sessionId(), "SYSTEM", "SESSION_CLOSED")
        );
    }
}
