package kr.co.linker.evaluation.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.common.ai.LinkerChatModel;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.contract.repository.ContractRepository;
import kr.co.linker.evaluation.domain.Evaluation;
import kr.co.linker.evaluation.dto.CreateEvaluationRequest;
import kr.co.linker.evaluation.dto.EvaluationResponse;
import kr.co.linker.evaluation.repository.EvaluationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 평가 서비스 (F-4.2)
 *
 * <p>자유 형식 피드백 → Gemini LLM → 구조화된 JSON 저장.
 * AI가 부여한 overallScore로 trustScore를 도출한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EvaluationService {

    private final EvaluationRepository evaluationRepository;
    private final ContractRepository contractRepository;
    private final LinkerChatModel chatLanguageModel;
    private final PromptLoader promptLoader;
    private final ObjectMapper objectMapper;

    /**
     * 평가를 등록하고 AI 구조화 분석을 수행한다.
     *
     * @param evaluatorId 평가자 UUID
     * @param request     평가 등록 요청
     * @return 생성된 평가 응답 DTO
     */
    @Transactional
    public EvaluationResponse create(UUID evaluatorId, CreateEvaluationRequest request) {
        if (!contractRepository.existsById(request.contractId())) {
            throw new LinkerException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND", "계약을 찾을 수 없습니다.");
        }

        Evaluation evaluation = Evaluation.create(
                request.contractId(), evaluatorId,
                request.evaluatorRole(), request.rawFeedback()
        );

        // AI 구조화 분석
        String prompt = promptLoader.load("evaluate-feedback", Map.of(
                "evaluatorRole", request.evaluatorRole(),
                "rawFeedback", request.rawFeedback()
        ));

        try {
            String raw = chatLanguageModel.chat(prompt);
            Map<String, Object> structured = parseJson(raw);
            BigDecimal trustScore = extractTrustScore(structured);
            evaluation.attachStructured(structured, trustScore);
        } catch (Exception e) {
            log.warn("[EVAL_AI_SKIP] evaluatorId={} reason={}", evaluatorId, e.getMessage());
        }

        evaluationRepository.save(evaluation);
        log.info("[EVALUATION_CREATED] id={} contractId={}", evaluation.getId(), request.contractId());
        return EvaluationResponse.from(evaluation);
    }

    /**
     * 계약별 평가 목록을 조회한다.
     *
     * @param contractId 계약 UUID
     * @return 평가 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<EvaluationResponse> listByContract(UUID contractId) {
        return evaluationRepository.findByContractIdOrderByCreatedAtDesc(contractId)
                .stream().map(EvaluationResponse::from).toList();
    }

    private Map<String, Object> parseJson(String raw) {
        try {
            String json = raw.trim();
            int s = json.indexOf('{');
            int e = json.lastIndexOf('}');
            if (s >= 0 && e > s) json = json.substring(s, e + 1);
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ex) {
            log.warn("[EVAL_PARSE_FAIL] {}", ex.getMessage());
            return Map.of("raw", raw);
        }
    }

    private BigDecimal extractTrustScore(Map<String, Object> structured) {
        Object score = structured.get("overallScore");
        if (score instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue() * 20); // 5점 척도 → 100점 환산
        }
        return BigDecimal.valueOf(50);
    }
}
