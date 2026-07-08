package kr.co.linker.admin.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.admin.dto.ProjectAnalysisResult;
import kr.co.linker.common.ai.PromptLoader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectAnalysisService {

    private final ObjectMapper objectMapper;
    private final PromptLoader promptLoader;

    @Value("${linker.ai.gemini-api-key}")
    private String geminiApiKey;

    @Value("${linker.ai.llm-model:gemini-1.5-flash}")
    private String llmModel;

    public ProjectAnalysisResult analyze(String text) {
        if (text == null || text.isBlank()) return ProjectAnalysisResult.empty();

        String truncated = text.length() > 8000 ? text.substring(0, 8000) : text;
        String prompt = promptLoader.load("project-analyze", Map.of("projectText", truncated));

        try {
            String json = callGemini(prompt);
            if (json == null) return ProjectAnalysisResult.empty();

            ProjectAnalysisResult result = objectMapper.readValue(json, ProjectAnalysisResult.class);
            List<ProjectAnalysisResult.RoleItem> roles =
                    result.roles() != null ? result.roles() : List.of();
            ProjectAnalysisResult normalized = new ProjectAnalysisResult(
                    result.title(), result.clientCompany(), result.mainContractor(),
                    result.startDate(), result.endDate(), roles);
            log.info("[AI_PROJECT] 분석 완료: title={}, roles={}", normalized.title(), roles.size());
            return normalized;
        } catch (Exception e) {
            log.error("[AI_PROJECT] 분석 실패", e);
            return ProjectAnalysisResult.empty();
        }
    }

    private String callGemini(String prompt) {
        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(10_000);
            factory.setReadTimeout(60_000);
            RestTemplate restTemplate = new RestTemplate(factory);
            restTemplate.getMessageConverters().add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));

            String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + llmModel + ":generateContent?key=" + geminiApiKey;

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json; charset=utf-8");
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));

            ResponseEntity<String> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(requestBody, headers), String.class);
            String body = response.getBody();
            if (body == null) return null;

            @SuppressWarnings("unchecked")
            Map<String, Object> parsed = objectMapper.readValue(body, Map.class);
            if (!parsed.containsKey("candidates")) return null;

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) parsed.get("candidates");
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String jsonStr = (String) parts.get(0).get("text");

            String clean = jsonStr.replaceAll("(?s)```json\\s*", "").replaceAll("```", "").trim();
            int start = clean.indexOf('{');
            int end = clean.lastIndexOf('}');
            if (start >= 0 && end > start) clean = clean.substring(start, end + 1);

            log.debug("[AI_PROJECT] Gemini 응답: {}", clean);
            return clean;
        } catch (Exception e) {
            log.error("[AI_PROJECT] Gemini API 호출 실패", e);
            return null;
        }
    }
}
