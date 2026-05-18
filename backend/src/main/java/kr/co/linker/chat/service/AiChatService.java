package kr.co.linker.chat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import kr.co.linker.common.ai.LinkerChatModel;
import kr.co.linker.common.ai.PromptLoader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AI 챗 서비스 (F-6.2)
 *
 * <p>세션별 대화 이력을 메모리에 유지하고, Gemini LLM을 통해 응답을 생성한다.
 * 세션 종료 시 chat_histories 테이블에 영구 저장한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiChatService {

    private static final int MAX_HISTORY = 20;

    private final LinkerChatModel chatLanguageModel;
    private final PromptLoader promptLoader;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    /** sessionId → 대화 이력 */
    private final ConcurrentHashMap<String, List<Map<String, String>>> sessions = new ConcurrentHashMap<>();

    /**
     * 사용자 메시지를 처리하고 AI 응답을 반환한다.
     *
     * @param sessionId 세션 ID
     * @param userId    사용자 UUID
     * @param userName  사용자 이름 (시스템 프롬프트용)
     * @param userRole  사용자 역할
     * @param userInput 사용자 입력 텍스트
     * @return AI 응답 텍스트
     */
    public String chat(String sessionId, UUID userId, String userName,
                       String userRole, String userInput) {
        List<Map<String, String>> history = sessions.computeIfAbsent(sessionId, k -> new ArrayList<>());

        String systemPrompt = promptLoader.load("chat-system", Map.of(
                "userName", userName,
                "userRole", userRole,
                "currentTime", OffsetDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
        ));

        // LangChain4j 메시지 목록 구성
        List<dev.langchain4j.data.message.ChatMessage> messages = new ArrayList<>();
        messages.add(SystemMessage.from(systemPrompt));
        for (var h : history) {
            if ("user".equals(h.get("role"))) {
                messages.add(UserMessage.from(h.get("content")));
            } else {
                messages.add(AiMessage.from(h.get("content")));
            }
        }
        messages.add(UserMessage.from(userInput));

        String response = chatLanguageModel.chat(messages);

        // 이력 갱신
        history.add(Map.of("role", "user", "content", userInput));
        history.add(Map.of("role", "assistant", "content", response));

        // 이력이 MAX를 초과하면 앞에서 잘라냄
        if (history.size() > MAX_HISTORY * 2) {
            history.subList(0, 2).clear();
        }

        log.info("[CHAT] sessionId={} userId={}", sessionId, userId);
        return response;
    }

    /**
     * 세션을 종료하고 대화 이력을 DB에 저장한다.
     *
     * @param sessionId 세션 ID
     * @param userId    사용자 UUID
     */
    public void closeSession(String sessionId, UUID userId) {
        List<Map<String, String>> history = sessions.remove(sessionId);
        if (history == null || history.isEmpty()) return;

        try {
            String messagesJson = objectMapper.writeValueAsString(history);
            jdbcTemplate.update(
                    "INSERT INTO chat_histories (id, user_id, session_id, messages, started_at, ended_at) " +
                    "VALUES (?, ?, ?, ?::jsonb, NOW(), NOW())",
                    UUID.randomUUID(), userId, sessionId, messagesJson
            );
            log.info("[CHAT_CLOSED] sessionId={} userId={} turns={}", sessionId, userId, history.size() / 2);
        } catch (Exception e) {
            log.error("[CHAT_SAVE_FAIL] sessionId={} error={}", sessionId, e.getMessage());
        }
    }
}
