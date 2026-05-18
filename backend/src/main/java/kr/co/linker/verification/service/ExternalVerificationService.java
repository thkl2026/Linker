package kr.co.linker.verification.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.verification.domain.VerificationLog;
import kr.co.linker.verification.repository.VerificationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 이력 외부 검증 서비스 (F-1.6)
 *
 * <p>GitHub API로 프로젝트 실존성을 검증하고, 학력·자격증은 stub으로 처리한다.
 * 실제 운영 시 NICE 학사정보 API, 자격증 공공 API로 교체 예정.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExternalVerificationService {

    private static final String GITHUB_API_BASE = "https://api.github.com";

    private final VerificationLogRepository verificationLogRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 프로젝트 실존성을 GitHub API로 검증한다.
     *
     * <p>experienceId에 연결된 GitHub 저장소 URL에서 owner/repo를 파싱하여
     * GitHub API 응답으로 실존 여부를 확인한다.
     *
     * @param experienceId 이력 UUID
     * @param githubRepoUrl 검증할 GitHub 저장소 URL
     * @return 생성된 검증 로그
     */
    @Transactional
    public VerificationLog verifyGithubProject(UUID experienceId, String githubRepoUrl) {
        log.info("[VERIFY_GITHUB] experienceId={} url={}", experienceId, githubRepoUrl);

        Map<String, Object> detail = new HashMap<>();
        String result;

        try {
            String repoPath = extractRepoPath(githubRepoUrl);
            String apiUrl = GITHUB_API_BASE + "/repos/" + repoPath;

            String response = restTemplate.getForObject(apiUrl, String.class);
            JsonNode node = objectMapper.readTree(response);

            detail.put("fullName", node.path("full_name").asText());
            detail.put("stars", node.path("stargazers_count").asInt());
            detail.put("forks", node.path("forks_count").asInt());
            detail.put("language", node.path("language").asText());
            detail.put("private", node.path("private").asBoolean());

            result = "PASSED";
            log.info("[VERIFY_GITHUB] PASSED repoPath={}", repoPath);

        } catch (Exception e) {
            log.warn("[VERIFY_GITHUB] FAILED experienceId={} reason={}", experienceId, e.getMessage());
            detail.put("error", e.getMessage());
            result = "FAILED";
        }

        VerificationLog log2 = VerificationLog.create(
                experienceId, "PROJECT_EXISTENCE", "GITHUB_API", result, detail);
        return verificationLogRepository.save(log2);
    }

    /**
     * 학력을 검증한다 — 현재는 stub 처리 (MANUAL_REQUIRED 반환).
     *
     * <p>Phase 6 이후 NICE 학사정보 API 연동으로 교체 예정.
     *
     * @param experienceId 이력 UUID
     * @param university   대학교명
     * @param degree       학위명
     * @return 생성된 검증 로그
     */
    @Transactional
    public VerificationLog verifyAcademic(UUID experienceId, String university, String degree) {
        log.info("[VERIFY_ACADEMIC] experienceId={} university={}", experienceId, university);

        Map<String, Object> detail = Map.of(
                "university", university,
                "degree", degree,
                "note", "NICE 학사정보 API 연동 전 수동 검증 필요"
        );

        VerificationLog verificationLog = VerificationLog.create(
                experienceId, "ACADEMIC", "ACADEMIC_STUB", "MANUAL_REQUIRED", detail);
        return verificationLogRepository.save(verificationLog);
    }

    /**
     * 이력 UUID에 대한 모든 검증 로그를 반환한다.
     *
     * @param experienceId 이력 UUID
     * @return 검증 로그 목록 (최신순)
     */
    public List<VerificationLog> listByExperience(UUID experienceId) {
        return verificationLogRepository.findByExperienceIdOrderByVerifiedAtDesc(experienceId);
    }

    private String extractRepoPath(String url) {
        // https://github.com/owner/repo → owner/repo
        return url.replaceFirst("https?://github\\.com/", "").replaceAll("/$", "");
    }
}
