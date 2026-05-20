package kr.co.linker.matching.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.model.chat.ChatLanguageModel;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.matching.domain.MatchProposal;
import kr.co.linker.matching.repository.MatchProposalRepository;
import kr.co.linker.verification.repository.VerificationLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 인터뷰 가이드 자동 생성 서비스 (F-2.5)
 *
 * <p>Red-flag(이력 검증 실패)와 매칭 제안의 우려사항을 통합하여
 * 심층 인터뷰 질문 가이드를 생성한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InterviewGuideService {

    private final MatchProposalRepository matchProposalRepository;
    private final VerificationLogRepository verificationLogRepository;
    private final ChatLanguageModel chatLanguageModel;
    private final PromptLoader promptLoader;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 매칭 제안 ID를 기반으로 심층 인터뷰 가이드를 생성한다 (F-2.5).
     *
     * <p>Red-flag(검증 실패 이력)와 우려사항을 포함하여 프롬프트를 구성한다.
     *
     * @param proposalId 매칭 제안 UUID
     * @return 인터뷰 가이드 맵 (questions, warningPoints, overallRisk)
     */
    @Transactional(readOnly = true)
    public Map<String, Object> generateGuide(UUID proposalId) {
        MatchProposal proposal = matchProposalRepository.findById(proposalId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "PROPOSAL_NOT_FOUND", "매칭 제안을 찾을 수 없습니다."));

        String talentSummary = buildTalentSummary(proposal.getTalentId());
        List<String> redFlags = collectRedFlags(proposal.getTalentId());
        String concernsText = proposal.getConcerns() != null
                ? String.join(", ", proposal.getConcerns()) : "없음";
        String requirementsText = loadProjectRequirements(proposal.getProjectId());

        log.info("[INTERVIEW_GUIDE] proposalId={} redFlags={}", proposalId, redFlags.size());

        try {
            String prompt = promptLoader.load("interview-guide", Map.of(
                    "talentSummary",        talentSummary,
                    "redFlags",             redFlags.isEmpty() ? "없음" : String.join("\n- ", redFlags),
                    "concerns",             concernsText,
                    "projectRequirements",  requirementsText
            ));

            String response = chatLanguageModel.generate(prompt);
            String json = extractJson(response);
            return objectMapper.readValue(json, Map.class);

        } catch (Exception e) {
            log.warn("[INTERVIEW_GUIDE] LLM 실패 proposalId={}: {}", proposalId, e.getMessage());
            return Map.of(
                    "questions",      Collections.emptyList(),
                    "warningPoints",  List.of("AI 생성 실패 — 수동 준비 필요"),
                    "overallRisk",    "MEDIUM"
            );
        }
    }

    private String buildTalentSummary(UUID talentId) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT name || ' | 가용상태: ' || availability_status || " +
                    "' | 희망단가: ' || COALESCE(desired_rate::text, '미지정') FROM talent_profiles WHERE id = ?",
                    String.class, talentId);
        } catch (Exception e) {
            return "정보 없음";
        }
    }

    private List<String> collectRedFlags(UUID talentId) {
        // 인력의 이력에 연결된 검증 실패(FAILED) 로그 수집
        try {
            List<UUID> experienceIds = jdbcTemplate.queryForList(
                    "SELECT id FROM talent_experiences WHERE talent_id = ?",
                    UUID.class, talentId);

            return experienceIds.stream()
                    .flatMap(expId -> verificationLogRepository
                            .findByExperienceIdOrderByVerifiedAtDesc(expId).stream())
                    .filter(v -> "FAILED".equals(v.getResult()))
                    .map(v -> v.getVerificationType() + ": " +
                              (v.getDetail() != null ? v.getDetail().getOrDefault("error", "검증 실패") : "검증 실패"))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String loadProjectRequirements(UUID projectId) {
        try {
            return jdbcTemplate.queryForObject(
                    "SELECT title || ': ' || COALESCE(description, '') FROM project_opportunities WHERE id = ?",
                    String.class, projectId);
        } catch (Exception e) {
            return "정보 없음";
        }
    }

    private String extractJson(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        if (start >= 0 && end > start) return text.substring(start, end + 1);
        return "{}";
    }
}
