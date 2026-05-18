package kr.co.linker.contract.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.contract.dto.ContractResponse;
import kr.co.linker.contract.dto.CreateContractRequest;
import kr.co.linker.contract.service.ContractService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * 계약 관리 API 컨트롤러 (F-3.1)
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "Contract", description = "계약 생성·서명·PDF 다운로드 API")
@RestController
@RequestMapping("/api/v1/contracts")
@RequiredArgsConstructor
public class ContractController {

    private final ContractService contractService;

    /**
     * 계약 초안 생성 (AI 단가 분석 포함)
     *
     * @param userDetails  인증된 사용자 (PROCUREMENT 또는 ADMIN)
     * @param request      계약 생성 요청
     * @return 201 Created + ContractResponse
     */
    @Operation(summary = "계약 초안 생성 (F-3.1) — AI 단가 분석 포함")
    @PostMapping
    @PreAuthorize("hasAnyRole('PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<ContractResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateContractRequest request) {
        UUID procurementId = UUID.fromString(userDetails.getUsername());
        ContractResponse response = contractService.create(procurementId, request);
        return ResponseEntity.created(URI.create("/api/v1/contracts/" + response.id())).body(response);
    }

    /**
     * 프로젝트별 계약 목록 조회
     *
     * @param projectId 프로젝트 UUID
     * @return 계약 목록
     */
    @Operation(summary = "프로젝트별 계약 목록")
    @GetMapping("/by-project/{projectId}")
    @PreAuthorize("hasAnyRole('PM', 'PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<List<ContractResponse>> listByProject(@PathVariable UUID projectId) {
        return ResponseEntity.ok(contractService.listByProject(projectId));
    }

    /**
     * 인력별 계약 목록 조회
     *
     * @param talentId 인력 프로필 UUID
     * @return 계약 목록
     */
    @Operation(summary = "인력별 계약 목록")
    @GetMapping("/by-talent/{talentId}")
    @PreAuthorize("hasAnyRole('TALENT', 'PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<List<ContractResponse>> listByTalent(@PathVariable UUID talentId) {
        return ResponseEntity.ok(contractService.listByTalent(talentId));
    }

    /**
     * 계약 서명 — PDF 생성 후 MinIO 저장
     *
     * @param contractId 계약 UUID
     * @return 204 No Content
     */
    @Operation(summary = "계약 서명 처리")
    @PutMapping("/{contractId}/sign")
    @PreAuthorize("hasAnyRole('PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<ContractResponse> sign(@PathVariable UUID contractId) {
        return ResponseEntity.ok(contractService.sign(contractId));
    }

    /**
     * 계약 해지
     *
     * @param contractId 계약 UUID
     * @return 204 No Content
     */
    @Operation(summary = "계약 해지")
    @PutMapping("/{contractId}/terminate")
    @PreAuthorize("hasAnyRole('PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<Void> terminate(@PathVariable UUID contractId) {
        contractService.terminate(contractId);
        return ResponseEntity.noContent().build();
    }

    /**
     * 계약서 PDF 다운로드
     *
     * @param contractId 계약 UUID
     * @return PDF 바이트 배열 (application/pdf)
     */
    @Operation(summary = "계약서 PDF 다운로드")
    @GetMapping("/{contractId}/pdf")
    @PreAuthorize("hasAnyRole('TALENT', 'PM', 'PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable UUID contractId) {
        byte[] pdf = contractService.generatePdf(contractId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"contract-" + contractId + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
