package kr.co.linker.settlement.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.linker.settlement.dto.SettlementResponse;
import kr.co.linker.settlement.service.SettlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * 정산 API 컨트롤러 (F-4.1)
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "Settlement", description = "정산 생성·승인·지급 처리 API")
@RestController
@RequestMapping("/api/v1/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    /**
     * 정산 초안 생성 (승인된 타임시트 자동 집계)
     *
     * @param contractId      계약 UUID
     * @param settlementMonth 정산 대상 월 (YYYY-MM-dd, 예: 2026-04-01)
     * @param deduction       공제액 (선택, 기본 0)
     * @return 201 Created + SettlementResponse
     */
    @Operation(summary = "정산 초안 생성 (F-4.1) — 승인된 타임시트 자동 집계")
    @PostMapping
    @PreAuthorize("hasAnyRole('PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<SettlementResponse> generate(
            @RequestParam UUID contractId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate settlementMonth,
            @RequestParam(defaultValue = "0") BigDecimal deduction) {
        SettlementResponse response = settlementService.generate(contractId, settlementMonth, deduction);
        return ResponseEntity.created(URI.create("/api/v1/settlements/" + response.id())).body(response);
    }

    /**
     * 계약별 정산 목록
     *
     * @param contractId 계약 UUID
     * @return 정산 목록
     */
    @Operation(summary = "계약별 정산 목록")
    @GetMapping("/by-contract/{contractId}")
    @PreAuthorize("hasAnyRole('PM', 'PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<List<SettlementResponse>> listByContract(@PathVariable UUID contractId) {
        return ResponseEntity.ok(settlementService.listByContract(contractId));
    }

    /**
     * 인력별 정산 목록 (TALENT 본인 + 관리자)
     *
     * @param talentId 인력 UUID
     * @return 정산 목록
     */
    @Operation(summary = "인력별 정산 목록")
    @GetMapping("/by-talent/{talentId}")
    @PreAuthorize("hasAnyRole('TALENT', 'PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<List<SettlementResponse>> listByTalent(@PathVariable UUID talentId) {
        return ResponseEntity.ok(settlementService.listByTalent(talentId));
    }

    /**
     * 정산 승인
     *
     * @param settlementId 정산 UUID
     * @param userDetails  승인자
     * @return 승인된 정산
     */
    @Operation(summary = "정산 승인")
    @PutMapping("/{settlementId}/approve")
    @PreAuthorize("hasAnyRole('PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<SettlementResponse> approve(
            @PathVariable UUID settlementId,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID approverId = UUID.fromString(userDetails.getUsername());
        return ResponseEntity.ok(settlementService.approve(settlementId, approverId));
    }

    /**
     * 지급 완료 처리
     *
     * @param settlementId 정산 UUID
     * @return 지급 완료 정산
     */
    @Operation(summary = "지급 완료 처리")
    @PutMapping("/{settlementId}/pay")
    @PreAuthorize("hasAnyRole('PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<SettlementResponse> markPaid(@PathVariable UUID settlementId) {
        return ResponseEntity.ok(settlementService.markPaid(settlementId));
    }
}
