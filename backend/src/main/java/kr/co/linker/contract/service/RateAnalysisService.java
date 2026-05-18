package kr.co.linker.contract.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.common.ai.LinkerChatModel;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 단가 적정성 AI 분석 서비스 (F-3.2)
 *
 * <p>Gemini LLM을 통해 시장 단가 비교·협상 포인트를 도출한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RateAnalysisService {

    private final LinkerChatModel chatLanguageModel;
    private final PromptLoader promptLoader;
    private final TalentProfileRepository talentProfileRepository;
    private final ObjectMapper objectMapper;

    /**
     * 인력·프로젝트 정보를 바탕으로 단가 분석을 수행한다.
     *
     * @param talentId     인력 프로필 UUID
     * @param budgetMin    프로젝트 예산 최솟값
     * @param budgetMax    프로젝트 예산 최댓값
     * @param requiredSkills 요구 기술 목록 (쉼표 구분)
     * @param workType     근무 형태
     * @return AI 분석 결과 Map
     */
    public Map<String, Object> analyze(UUID talentId,
                                       BigDecimal budgetMin,
                                       BigDecimal budgetMax,
                                       String requiredSkills,
                                       String workType) {
        TalentProfile profile = talentProfileRepository.findById(talentId)
                .orElseThrow(() -> new IllegalArgumentException("인력 프로필 없음: " + talentId));

        String skills = profile.getSkills().stream()
                .map(s -> s.getSkillName() + "(" + s.getLevel() + ")")
                .collect(Collectors.joining(", "));

        String prompt = promptLoader.load("rate-analysis", Map.of(
                "skills", skills,
                "talentScore", String.valueOf(profile.getTotalScore()),
                "desiredRate", profile.getDesiredRate() != null ? profile.getDesiredRate().toPlainString() : "미정",
                "budgetMin", budgetMin != null ? budgetMin.toPlainString() : "미정",
                "budgetMax", budgetMax != null ? budgetMax.toPlainString() : "미정",
                "requiredSkills", requiredSkills != null ? requiredSkills : "미정",
                "workType", workType != null ? workType : "REMOTE"
        ));

        String raw = chatLanguageModel.chat(prompt);
        log.info("[RATE_ANALYSIS] talentId={}", talentId);

        return parseJson(raw, talentId);
    }

    private Map<String, Object> parseJson(String raw, UUID talentId) {
        try {
            String json = raw.trim();
            int start = json.indexOf('{');
            int end = json.lastIndexOf('}');
            if (start >= 0 && end > start) {
                json = json.substring(start, end + 1);
            }
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[RATE_ANALYSIS_PARSE_FAIL] talentId={} error={}", talentId, e.getMessage());
            return Map.of("error", "분석 결과 파싱 실패", "raw", raw);
        }
    }
}
