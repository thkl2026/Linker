package kr.co.linker.talent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.common.ai.LinkerChatModel;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 인력 경력 이력 AI 검증 서비스 (F-1.5)
 *
 * <p>날짜 겹침·모순, 기간 과장, 기술 모순을 검사하여 Red-flag를 생성한다.
 * 결과는 {@code overallRisk} (LOW/MEDIUM/HIGH) + {@code flags} 배열로 반환된다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HistoryValidationService {

    private final LinkerChatModel chatLanguageModel;
    private final TalentProfileRepository talentProfileRepository;
    private final PromptLoader promptLoader;
    private final ObjectMapper objectMapper;

    /**
     * 경력 이력 AI 검증을 수행한다.
     *
     * @param talentId 인력 프로필 UUID
     * @return 검증 결과 ({@code overallRisk}, {@code flags}, {@code summary})
     */
    public Map<String, Object> validate(UUID talentId) {
        var profile = talentProfileRepository.findById(talentId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "TALENT_NOT_FOUND", "인력 프로필을 찾을 수 없습니다."));

        log.info("[HISTORY_VALIDATE_START] talentId={}", talentId);

        List<Map<String, Object>> experiences = profile.getSkills().stream()
                .map(s -> Map.<String, Object>of(
                        "skillName", s.getSkillName(),
                        "level", s.getLevel() != null ? s.getLevel() : "",
                        "years", s.getYears() != null ? s.getYears() : 0
                ))
                .toList();

        String experiencesJson = toJson(experiences);
        String prompt = promptLoader.load("history-validate", Map.of("experiencesJson", experiencesJson));
        String llmResponse = chatLanguageModel.chat(prompt);

        Map<String, Object> result = parseJson(llmResponse, talentId);
        log.info("[HISTORY_VALIDATE_DONE] talentId={} risk={}", talentId, result.get("overallRisk"));
        return result;
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String llmResponse, UUID talentId) {
        String json = extractJsonBlock(llmResponse);
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            log.error("[HISTORY_VALIDATE_JSON_ERROR] talentId={}", talentId);
            return Map.of("overallRisk", "LOW", "flags", List.of(), "summary", "검증 실패");
        }
    }

    private String extractJsonBlock(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        return (start >= 0 && end > start) ? text.substring(start, end + 1) : "{}";
    }
}
