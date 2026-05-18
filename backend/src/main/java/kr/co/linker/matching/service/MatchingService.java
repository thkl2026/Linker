package kr.co.linker.matching.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.data.embedding.Embedding;
import kr.co.linker.common.ai.LinkerChatModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.matching.domain.MatchProposal;
import kr.co.linker.matching.dto.MatchProposalResponse;
import kr.co.linker.matching.repository.MatchProposalRepository;
import kr.co.linker.project.repository.ProjectOpportunityRepository;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * AI 매칭 서비스 (F-2.2)
 *
 * <p>pgvector 코사인 유사도로 상위 인력을 선별하고,
 * LLM으로 매칭 이유·강점·우려사항·인터뷰 가이드를 생성한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {

    private static final int CANDIDATE_LIMIT = 10;

    private final EmbeddingModel embeddingModel;
    private final LinkerChatModel chatLanguageModel;
    private final MatchProposalRepository matchProposalRepository;
    private final ProjectOpportunityRepository projectRepository;
    private final TalentProfileRepository talentProfileRepository;
    private final PromptLoader promptLoader;
    private final ObjectMapper objectMapper;
    private final kr.co.linker.common.metrics.LinkerMetrics linkerMetrics;

    /**
     * 프로젝트에 대한 AI 인력 추천을 생성한다 (F-2.2).
     *
     * <p>프로젝트 요구사항을 임베딩 → 벡터 유사도 검색 → 상위 후보 LLM 분석 → 제안 저장.
     *
     * @param projectId 프로젝트 UUID
     * @return 생성된 매칭 제안 수
     */
    @Transactional
    public int generateProposals(UUID projectId) {
        var project = projectRepository.findById(projectId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "PROJECT_NOT_FOUND", "프로젝트를 찾을 수 없습니다."));

        log.info("[MATCHING_START] projectId={}", projectId);

        // 프로젝트 요구사항 텍스트 임베딩
        String requirementsText = buildRequirementsText(project.getTitle(),
                project.getDescription(), project.getRequiredSkills());
        Embedding embedding = embeddingModel.embed(requirementsText).content();
        String vectorStr = Arrays.toString(embedding.vector()).replace(" ", "");

        // pgvector 유사도 검색
        List<Object[]> candidates = matchProposalRepository.findTopSimilarTalents(vectorStr, CANDIDATE_LIMIT);

        int created = 0;
        for (Object[] row : candidates) {
            UUID talentId = UUID.fromString((String) row[0]);
            BigDecimal similarity = BigDecimal.valueOf(((Number) row[1]).doubleValue());

            // 중복 제안 방지
            if (matchProposalRepository.findByProjectIdAndTalentId(projectId, talentId).isPresent()) {
                continue;
            }

            var talentOpt = talentProfileRepository.findById(talentId);
            if (talentOpt.isEmpty()) continue;
            var talent = talentOpt.get();

            // LLM 매칭 이유 생성
            Map<String, Object> matchAnalysis = generateMatchReason(
                    project.getTitle() + " " + project.getDescription(),
                    talent.getName() + " " + buildSkillSummary(talent),
                    similarity
            );

            MatchProposal proposal = MatchProposal.create(
                    projectId, talentId, similarity,
                    (String) matchAnalysis.getOrDefault("matchReason", ""),
                    toStringList(matchAnalysis.get("strengths")),
                    toStringList(matchAnalysis.get("concerns")),
                    toStringList(matchAnalysis.get("interviewGuide"))
            );
            matchProposalRepository.save(proposal);
            created++;
        }

        linkerMetrics.incrementMatchProposalsCreated(created);
        log.info("[MATCHING_DONE] projectId={} proposals={}", projectId, created);
        return created;
    }

    /**
     * 프로젝트별 매칭 제안 목록 조회
     *
     * @param projectId 프로젝트 UUID
     * @param pageable  페이지네이션
     * @return 제안 페이지
     */
    @Transactional(readOnly = true)
    public Page<MatchProposalResponse> listProposals(UUID projectId, Pageable pageable) {
        return matchProposalRepository
                .findByProjectIdOrderBySimilarityScoreDesc(projectId, pageable)
                .map(MatchProposalResponse::from);
    }

    /**
     * 제안 수락/거절
     *
     * @param proposalId 제안 UUID
     * @param accept     true → 수락, false → 거절
     */
    @Transactional
    public void respond(UUID proposalId, boolean accept) {
        MatchProposal proposal = matchProposalRepository.findById(proposalId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "PROPOSAL_NOT_FOUND", "매칭 제안을 찾을 수 없습니다."));
        if (accept) {
            proposal.accept();
        } else {
            proposal.reject();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> generateMatchReason(String requirements, String talentSummary,
                                                     BigDecimal similarity) {
        String prompt = promptLoader.load("match-reason", Map.of(
                "projectRequirements", requirements,
                "talentProfile", talentSummary,
                "similarityScore", similarity.toPlainString()
        ));
        String llmResponse = chatLanguageModel.chat(prompt);
        String json = extractJsonBlock(llmResponse);
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            return Map.of("matchReason", "AI 분석 실패", "strengths", List.of(), "concerns", List.of(), "interviewGuide", List.of());
        }
    }

    private String buildRequirementsText(String title, String description, String requiredSkills) {
        return title + "\n" + (description != null ? description : "") + "\n" + (requiredSkills != null ? requiredSkills : "");
    }

    private String buildSkillSummary(kr.co.linker.talent.domain.TalentProfile talent) {
        StringBuilder sb = new StringBuilder();
        talent.getSkills().forEach(s -> sb.append(s.getSkillName()).append(" "));
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private List<String> toStringList(Object obj) {
        if (obj instanceof List<?> list) {
            return list.stream().map(Object::toString).toList();
        }
        return List.of();
    }

    private String extractJsonBlock(String text) {
        int start = text.indexOf('{');
        int end = text.lastIndexOf('}');
        return (start >= 0 && end > start) ? text.substring(start, end + 1) : "{}";
    }
}
