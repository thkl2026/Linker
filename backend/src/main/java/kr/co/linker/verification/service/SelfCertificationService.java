package kr.co.linker.verification.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.common.ai.LinkerChatModel;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.repository.TalentProfileRepository;
import kr.co.linker.verification.domain.SelfCertification;
import kr.co.linker.verification.repository.SelfCertificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 자가 증명 가점 서비스 (F-1.7)
 *
 * <p>GitHub API로 개발자 활동을 분석하고, LLM으로 bonus_score를 산정한다.
 * 산정된 점수는 TalentProfile의 bonusScore에 반영되어 total_score에 포함된다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SelfCertificationService {

    private static final String GITHUB_API_BASE = "https://api.github.com";

    private final SelfCertificationRepository selfCertificationRepository;
    private final TalentProfileRepository talentProfileRepository;
    private final LinkerChatModel chatLanguageModel;
    private final PromptLoader promptLoader;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    /**
     * GitHub 프로파일을 분석하여 bonus_score를 부여한다 (F-1.7).
     *
     * <p>GitHub API로 공개 저장소·스타·커밋·언어를 수집하고,
     * Gemini LLM으로 0~10점 가점을 산정한다.
     *
     * @param talentId       인력 UUID
     * @param githubUsername GitHub 사용자명
     * @return 생성된 자가 증명 레코드
     */
    @Transactional
    public SelfCertification analyzeGithub(UUID talentId, String githubUsername) {
        log.info("[SELF_CERT_GITHUB] talentId={} username={}", talentId, githubUsername);

        TalentProfile profile = talentProfileRepository.findById(talentId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "TALENT_NOT_FOUND", "인력을 찾을 수 없습니다."));

        String sourceUrl = "https://github.com/" + githubUsername;

        // 중복 분석 방지 — 이미 분석된 URL은 재사용
        return selfCertificationRepository
                .findByTalentIdAndSourceUrl(talentId, sourceUrl)
                .orElseGet(() -> runGithubAnalysis(profile, githubUsername, sourceUrl));
    }

    private SelfCertification runGithubAnalysis(TalentProfile profile,
                                                  String username, String sourceUrl) {
        Map<String, Object> githubData = fetchGithubData(username);
        BigDecimal bonusScore = calculateBonusScore(username, githubData);

        SelfCertification sc = SelfCertification.create(
                profile.getId(), "GITHUB", sourceUrl, githubData, bonusScore);
        selfCertificationRepository.save(sc);

        // TalentProfile bonus_score 업데이트
        BigDecimal newBonus = bonusScore.max(profile.getBonusScore() != null
                ? profile.getBonusScore() : BigDecimal.ZERO);
        profile.updateScore(
                profile.getSkillScore() != null ? profile.getSkillScore() : BigDecimal.ZERO,
                profile.getReliabilityScore() != null ? profile.getReliabilityScore() : BigDecimal.ZERO,
                newBonus
        );

        log.info("[SELF_CERT_GITHUB] talentId={} bonusScore={}", profile.getId(), bonusScore);
        return sc;
    }

    private Map<String, Object> fetchGithubData(String username) {
        Map<String, Object> data = new HashMap<>();
        try {
            String userUrl = GITHUB_API_BASE + "/users/" + username;
            String userJson = restTemplate.getForObject(userUrl, String.class);
            JsonNode user = objectMapper.readTree(userJson);

            int publicRepos = user.path("public_repos").asInt();
            data.put("username", username);
            data.put("publicRepos", publicRepos);
            data.put("followers", user.path("followers").asInt());

            // 저장소 스타 합계
            String reposUrl = GITHUB_API_BASE + "/users/" + username + "/repos?per_page=100&sort=updated";
            String reposJson = restTemplate.getForObject(reposUrl, String.class);
            JsonNode repos = objectMapper.readTree(reposJson);

            int totalStars = 0;
            Map<String, Integer> langCount = new HashMap<>();
            for (JsonNode repo : repos) {
                totalStars += repo.path("stargazers_count").asInt();
                String lang = repo.path("language").asText("Unknown");
                langCount.merge(lang, 1, Integer::sum);
            }

            data.put("totalStars", totalStars);
            data.put("topLanguages", langCount.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .limit(3)
                    .map(Map.Entry::getKey)
                    .toList());
            data.put("recentCommits", 0);   // GraphQL API 필요 — placeholder
            data.put("contributions", 0);

        } catch (Exception e) {
            log.warn("[GITHUB_FETCH] Failed for {}: {}", username, e.getMessage());
            data.put("error", e.getMessage());
        }
        return data;
    }

    private BigDecimal calculateBonusScore(String username, Map<String, Object> githubData) {
        try {
            String prompt = promptLoader.load("github-analysis",
                    Map.of(
                            "username",      username,
                            "publicRepos",   String.valueOf(githubData.getOrDefault("publicRepos", 0)),
                            "totalStars",    String.valueOf(githubData.getOrDefault("totalStars", 0)),
                            "recentCommits", String.valueOf(githubData.getOrDefault("recentCommits", 0)),
                            "topLanguages",  githubData.getOrDefault("topLanguages", "없음").toString(),
                            "contributions", String.valueOf(githubData.getOrDefault("contributions", 0))
                    ));

            String response = chatLanguageModel.chat(prompt);
            String json = extractJson(response);
            JsonNode node = objectMapper.readTree(json);
            double score = node.path("bonusScore").asDouble(0.0);
            githubData.put("aiAnalysis", node);
            return BigDecimal.valueOf(Math.min(10.0, Math.max(0.0, score)));

        } catch (Exception e) {
            log.warn("[GITHUB_SCORE] LLM 분석 실패: {}", e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    /**
     * 인력의 자가 증명 목록을 반환한다.
     *
     * @param talentId 인력 UUID
     * @return 자가 증명 목록
     */
    public List<SelfCertification> listByTalent(UUID talentId) {
        return selfCertificationRepository.findByTalentIdOrderByAnalyzedAtDesc(talentId);
    }

    private String extractJson(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) return text.substring(start, end + 1);
        return "{}";
    }
}
