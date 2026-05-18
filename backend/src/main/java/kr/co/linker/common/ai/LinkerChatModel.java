package kr.co.linker.common.ai;

import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * LangChain4j 0.35+ ChatRequest API wrapper — services call chat(String) or chat(List).
 */
@Component
@RequiredArgsConstructor
public class LinkerChatModel {

    private final ChatLanguageModel model;

    public String chat(String prompt) {
        return model.chat(ChatRequest.builder()
                .messages(UserMessage.from(prompt))
                .build())
                .aiMessage().text();
    }

    public String chat(List<ChatMessage> messages) {
        return model.chat(ChatRequest.builder()
                .messages(messages)
                .build())
                .aiMessage().text();
    }
}
