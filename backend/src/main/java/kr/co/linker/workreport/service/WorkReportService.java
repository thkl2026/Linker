package kr.co.linker.workreport.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.common.ai.LinkerChatModel;
import kr.co.linker.common.ai.PromptLoader;
import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.contract.domain.Contract;
import kr.co.linker.contract.repository.ContractRepository;
import kr.co.linker.notification.service.SseEmitterRegistry;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.repository.TalentProfileRepository;
import kr.co.linker.workreport.domain.WorkReport;
import kr.co.linker.workreport.dto.SubmitWorkReportRequest;
import kr.co.linker.workreport.dto.WorkReportResponse;
import kr.co.linker.workreport.repository.WorkReportRepository;
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
 * 주간 업무 보고 서비스 (F-4.3)
 *
 * <p>TALENT 등록 → Gemini LLM 리스크 분석 → HIGH 리스크 시 PM에게 SSE RISK_ALERT.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WorkReportService {

    private final WorkReportRepository workReportRepository;
    private final ContractRepository contractRepository;
    private final TalentProfileRepository talentProfileRepository;
    private final LinkerChatModel chatLanguageModel;
    private final PromptLoader promptLoader;
    private final SseEmitterRegistry sseEmitterRegistry;
    private final ObjectMapper objectMapper;
    private final kr.co.linker.common.metrics.LinkerMetrics linkerMetrics;

    /**
     * 주간 업무 보고를 등록하고 AI 리스크 분석을 수행한다.
     *
     * @param talentUserId 인증된 인력 사용자 UUID
     * @param request      업무 보고 등록 요청
     * @return 생성된 업무 보고 응답 DTO
     */
    @Transactional
    public WorkReportResponse submit(UUID talentUserId, SubmitWorkReportRequest request) {
        Contract contract = contractRepository.findById(request.contractId())
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "CONTRACT_NOT_FOUND", "계약을 찾을 수 없습니다."));

        TalentProfile profile = talentProfileRepository
                .findByUserIdAndDeletedAtIsNull(talentUserId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "TALENT_NOT_FOUND", "인력 프로필을 찾을 수 없습니다."));

        WorkReport report = WorkReport.create(
                request.contractId(), profile.getId(),
                request.reportWeek(), request.content()
        );

        // AI 리스크 분석
        try {
            String prompt = promptLoader.load("work-report-risk", Map.of(
                    "talentScore", profile.getTotalScore() != null ? profile.getTotalScore().toPlainString() : "0",
                    "unitPrice", contract.getUnitPrice() != null ? contract.getUnitPrice().toPlainString() : "미정",
                    "reportContent", request.content()
            ));
            String raw = chatLanguageModel.chat(prompt);
            Map<String, Object> result = parseJson(raw);

            String riskLevel = (String) result.getOrDefault("riskLevel", "LOW");
            String riskSummary = (String) result.getOrDefault("riskSummary", "");
            double sentiment = ((Number) result.getOrDefault("sentimentScore", 0.0)).doubleValue();

            report.attachAiAnalysis(riskLevel, riskSummary, BigDecimal.valueOf(sentiment));

            // HIGH 리스크 → PM에게 SSE 알림
            if ("HIGH".equals(riskLevel)) {
                sseEmitterRegistry.send(contract.getProcurementId(), "RISK_ALERT", Map.of(
                        "contractId", contract.getId(),
                        "talentId", profile.getId(),
                        "summary", riskSummary
                ));
                linkerMetrics.incrementRiskAlertsSent();
                log.warn("[RISK_ALERT] contractId={} talentId={}", contract.getId(), profile.getId());
            }
        } catch (Exception e) {
            log.warn("[WORK_REPORT_AI_SKIP] reason={}", e.getMessage());
        }

        workReportRepository.save(report);
        log.info("[WORK_REPORT_SUBMITTED] id={} talentId={}", report.getId(), profile.getId());
        return WorkReportResponse.from(report);
    }

    /**
     * 계약별 주간 업무 보고 목록을 조회한다.
     *
     * @param contractId 계약 UUID
     * @return 업무 보고 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<WorkReportResponse> listByContract(UUID contractId) {
        return workReportRepository.findByContractIdOrderByReportWeekDesc(contractId)
                .stream().map(WorkReportResponse::from).toList();
    }

    /**
     * 인력별 주간 업무 보고 목록을 조회한다.
     *
     * @param talentId 인력 프로필 UUID
     * @return 업무 보고 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<WorkReportResponse> listByTalent(UUID talentId) {
        return workReportRepository.findByTalentIdOrderByReportWeekDesc(talentId)
                .stream().map(WorkReportResponse::from).toList();
    }

    private Map<String, Object> parseJson(String raw) {
        try {
            String json = raw.trim();
            int s = json.indexOf('{');
            int e = json.lastIndexOf('}');
            if (s >= 0 && e > s) json = json.substring(s, e + 1);
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception ex) {
            return Map.of("riskLevel", "LOW", "sentimentScore", 0.0, "riskSummary", "분석 실패");
        }
    }
}
