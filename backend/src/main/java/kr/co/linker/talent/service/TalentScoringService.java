package kr.co.linker.talent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.common.ai.LinkerChatModel;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * AI 인력 스코어링 서비스 (F-1.3)
 *
 * <p>LLM 기반 다차원 스코어링: skill_score·reliability_score·bonus_score 계산.
 * 콜드스타트(신규 인력) 보정: skill_score × 0.8 적용.
 * total_score는 DB GENERATED ALWAYS 컬럼으로 자동 계산된다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TalentScoringService {

    private final LinkerChatModel chatLanguageModel;
    private final TalentProfileRepository talentProfileRepository;
    private final PromptLoader promptLoader;
    private final ObjectMapper objectMapper;

    /**
     * 인력 프로필 AI 스코어를 계산하고 저장한다.
     *
     * @param talentId 인력 프로필 UUID
     * @return 스코어링 결과 맵
     */
    @Transactional
    public Map<String, Object> recalculate(UUID talentId) {
        TalentProfile profile = talentProfileRepository.findById(talentId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "TALENT_NOT_FOUND", "인력 프로필을 찾을 수 없습니다."));

        log.info("[SCORING_START] talentId={}", talentId);

        String profileJson = buildProfileJson(profile);
        String prompt = promptLoader.load("talent-score", Map.of("talentProfileJson", profileJson));
        String llmResponse = chatLanguageModel.chat(prompt);

        Map<String, Object> scores = parseScores(llmResponse, talentId);
        applyScores(profile, scores);

        log.info("[SCORING_DONE] talentId={} skill={} reliability={} bonus={}",
                talentId, scores.get("skillScore"), scores.get("reliabilityScore"), scores.get("bonusScore"));
        return scores;
    }

    private void applyScores(TalentProfile profile, Map<String, Object> scores) {
        BigDecimal skillScore = toBigDecimal(scores.get("skillScore"));
        BigDecimal reliabilityScore = toBigDecimal(scores.get("reliabilityScore"));
        BigDecimal bonusScore = toBigDecimal(scores.get("bonusScore"));

        // 콜드스타트(performanceScore=0) 보정 — isNewTalent는 DB GENERATED 컬럼
        boolean isColdStart = profile.getPerformanceScore() == null
                || profile.getPerformanceScore().compareTo(BigDecimal.ZERO) == 0;
        if (isColdStart) {
            skillScore = skillScore.multiply(new BigDecimal("0.8"));
        }

        profile.updateScore(skillScore, reliabilityScore, bonusScore);
    }

    private String buildProfileJson(TalentProfile profile) {
        try {
            return objectMapper.writeValueAsString(Map.of(
                    "name", profile.getName(),
                    "workType", profile.getWorkType(),
                    "skills", profile.getSkills().stream().map(s -> Map.of(
                            "name", s.getSkillName(),
                            "level", s.getLevel() != null ? s.getLevel() : "",
                            "years", s.getYears() != null ? s.getYears() : 0
                    )).toList(),
                    "performanceScore", profile.getPerformanceScore() != null
                            ? profile.getPerformanceScore() : BigDecimal.ZERO
            ));
        } catch (Exception e) {
            return "{}";
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseScores(String llmResponse, UUID talentId) {
        String json = extractJsonBlock(llmResponse);
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            log.error("[SCORING_JSON_ERROR] talentId={} raw={}", talentId, llmResponse);
            return Map.of("skillScore", 50, "reliabilityScore", 50, "bonusScore", 0);
        }
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }

    private String extractJsonBlock(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        return (start >= 0 && end > start) ? text.substring(start, end + 1) : "{}";
    }
}
