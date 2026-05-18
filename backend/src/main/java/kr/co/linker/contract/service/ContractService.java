package kr.co.linker.contract.service;

import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.common.storage.FileStorageService;
import kr.co.linker.contract.domain.Contract;
import kr.co.linker.contract.dto.CreateContractRequest;
import kr.co.linker.contract.dto.ContractResponse;
import kr.co.linker.contract.repository.ContractRepository;
import kr.co.linker.project.repository.ProjectOpportunityRepository;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * 계약 관리 서비스 (F-3.1)
 *
 * <p>계약 생성·서명·PDF 생성·단가 분석을 담당한다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContractService {

    private final ContractRepository contractRepository;
    private final ProjectOpportunityRepository projectOpportunityRepository;
    private final TalentProfileRepository talentProfileRepository;
    private final ContractPdfService contractPdfService;
    private final RateAnalysisService rateAnalysisService;
    private final FileStorageService fileStorageService;
    private final kr.co.linker.common.metrics.LinkerMetrics linkerMetrics;

    /**
     * 계약 초안 생성 + AI 단가 분석을 즉시 수행한다.
     *
     * @param procurementId 구매 담당자 UUID
     * @param request       계약 생성 요청
     * @return 생성된 계약 응답 DTO
     */
    @Transactional
    public ContractResponse create(UUID procurementId, CreateContractRequest request) {
        if (!projectOpportunityRepository.existsById(request.projectId())) {
            throw new LinkerException(HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", "프로젝트를 찾을 수 없습니다.");
        }
        if (!talentProfileRepository.existsById(request.talentId())) {
            throw new LinkerException(HttpStatus.NOT_FOUND, "TALENT_NOT_FOUND", "인력 프로필을 찾을 수 없습니다.");
        }

        Contract contract = Contract.create(
                request.projectId(), request.talentId(), procurementId,
                request.unitPrice(), request.totalAmount(), request.contractTerms()
        );

        // AI 단가 분석 (비동기 불필요 — 계약 생성 흐름에서 즉시 제공)
        try {
            var analysis = rateAnalysisService.analyze(
                    request.talentId(),
                    BigDecimal.ZERO, request.totalAmount(),
                    null, null
            );
            contract.attachAiAnalysis(analysis);
        } catch (Exception e) {
            log.warn("[RATE_ANALYSIS_SKIP] reason={}", e.getMessage());
        }

        contractRepository.save(contract);
        log.info("[CONTRACT_CREATED] contractId={} procurementId={}", contract.getId(), procurementId);
        return ContractResponse.from(contract);
    }

    /**
     * 계약에 서명한다. PDF를 생성하여 MinIO에 저장하고 파일 URL을 기록한다.
     *
     * @param contractId 계약 UUID
     * @return 업데이트된 계약 응답 DTO
     */
    @Transactional
    public ContractResponse sign(UUID contractId) {
        Contract contract = findOrThrow(contractId);
        contract.sign();

        // PDF 생성 후 MinIO 업로드
        byte[] pdf = contractPdfService.generate(contract);
        String fileKey = "contracts/" + contractId + "/contract.pdf";
        try {
            String url = fileStorageService.uploadBytes(fileKey, pdf, "application/pdf");
            contract.attachFile(url);
        } catch (Exception e) {
            log.warn("[PDF_UPLOAD_SKIP] contractId={} reason={}", contractId, e.getMessage());
        }

        linkerMetrics.incrementContractsSigned();
        log.info("[CONTRACT_SIGNED] contractId={}", contractId);
        return ContractResponse.from(contract);
    }

    /**
     * 계약을 해지한다.
     *
     * @param contractId 계약 UUID
     */
    @Transactional
    public void terminate(UUID contractId) {
        Contract contract = findOrThrow(contractId);
        contract.terminate();
        log.info("[CONTRACT_TERMINATED] contractId={}", contractId);
    }

    /**
     * 인력별 계약 목록을 조회한다.
     *
     * @param talentId 인력 프로필 UUID
     * @return 계약 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<ContractResponse> listByTalent(UUID talentId) {
        return contractRepository.findByTalentIdOrderByCreatedAtDesc(talentId)
                .stream().map(ContractResponse::from).toList();
    }

    /**
     * 프로젝트별 계약 목록을 조회한다.
     *
     * @param projectId 프로젝트 UUID
     * @return 계약 응답 DTO 목록
     */
    @Transactional(readOnly = true)
    public List<ContractResponse> listByProject(UUID projectId) {
        return contractRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream().map(ContractResponse::from).toList();
    }

    /**
     * 계약서 PDF를 바이트 배열로 반환한다. 이미 파일이 있어도 재생성한다.
     *
     * @param contractId 계약 UUID
     * @return PDF 바이트 배열
     */
    @Transactional(readOnly = true)
    public byte[] generatePdf(UUID contractId) {
        Contract contract = findOrThrow(contractId);
        return contractPdfService.generate(contract);
    }

    private Contract findOrThrow(UUID contractId) {
        return contractRepository.findById(contractId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND,
                        "CONTRACT_NOT_FOUND", "계약을 찾을 수 없습니다."));
    }
}
