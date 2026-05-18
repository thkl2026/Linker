package kr.co.linker.common.config;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.StreamingResponseHandler;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import dev.langchain4j.model.output.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.List;

/**
 * AI 엔진 설정 — LangChain4j 0.35.0 + Gemini API Bean 등록
 */
@Configuration
public class AiConfig {

    @Value("${linker.ai.gemini-api-key}")
    private String geminiApiKey;

    @Value("${linker.ai.llm-model}")
    private String llmModel;

    @Bean
    public ChatLanguageModel chatLanguageModel() {
        return GoogleAiGeminiChatModel.builder()
                .apiKey(geminiApiKey)
                .modelName(llmModel)
                .timeout(Duration.ofSeconds(180))
                .maxRetries(2)
                .build();
    }

    @Bean
    public StreamingChatLanguageModel streamingChatLanguageModel() {
        return new StreamingChatLanguageModel() {
            @Override
            public void generate(List<ChatMessage> messages,
                                 StreamingResponseHandler<AiMessage> handler) {
                try {
                    String joined = messages.stream()
                            .map(ChatMessage::toString)
                            .reduce("", (a, b) -> a + "\n" + b);
                    String result = chatLanguageModel().chat(
                            ChatRequest.builder().messages(UserMessage.from(joined)).build()
                    ).aiMessage().text();
                    handler.onNext(result);
                    handler.onComplete(Response.from(AiMessage.from(result)));
                } catch (Exception e) {
                    handler.onError(e);
                }
            }
        };
    }

    @Bean
    public EmbeddingModel embeddingModel() {
        return new EmbeddingModel() {
            @Override
            public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                List<Embedding> result = segments.stream()
                        .map(s -> Embedding.from(new float[768]))
                        .toList();
                return Response.from(result);
            }
        };
    }
}
