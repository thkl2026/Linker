package kr.co.linker.workreport.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.workreport.dto.SubmitWorkReportRequest;
import kr.co.linker.workreport.dto.WorkReportResponse;
import kr.co.linker.workreport.service.WorkReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * 주간 업무 보고 API 컨트롤러 (F-4.3)
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "WorkReport", description = "주간 업무 보고 등록·조회 API (AI 리스크 분석 포함)")
@RestController
@RequestMapping("/api/v1/work-reports")
@RequiredArgsConstructor
public class WorkReportController {

    private final WorkReportService workReportService;

    /**
     * 주간 업무 보고 등록 — AI 리스크 분석 즉시 수행
     *
     * @param userDetails 인증된 인력 사용자 (TALENT)
     * @param request     업무 보고 등록 요청
     * @return 201 Created + WorkReportResponse
     */
    @Operation(summary = "주간 업무 보고 등록 (F-4.3) — AI 리스크 분석 포함")
    @PostMapping
    @PreAuthorize("hasRole('TALENT')")
    public ResponseEntity<WorkReportResponse> submit(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SubmitWorkReportRequest request) {
        UUID talentUserId = UUID.fromString(userDetails.getUsername());
        WorkReportResponse response = workReportService.submit(talentUserId, request);
        return ResponseEntity.created(URI.create("/api/v1/work-reports/" + response.id())).body(response);
    }

    /**
     * 계약별 업무 보고 목록
     *
     * @param contractId 계약 UUID
     * @return 업무 보고 목록
     */
    @Operation(summary = "계약별 업무 보고 목록")
    @GetMapping("/by-contract/{contractId}")
    @PreAuthorize("hasAnyRole('PM', 'PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<List<WorkReportResponse>> listByContract(@PathVariable UUID contractId) {
        return ResponseEntity.ok(workReportService.listByContract(contractId));
    }

    /**
     * 인력별 업무 보고 목록 (본인 전용)
     *
     * @param talentId 인력 UUID
     * @return 업무 보고 목록
     */
    @Operation(summary = "인력별 업무 보고 목록")
    @GetMapping("/by-talent/{talentId}")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN', 'TALENT')")
    public ResponseEntity<List<WorkReportResponse>> listByTalent(@PathVariable UUID talentId) {
        return ResponseEntity.ok(workReportService.listByTalent(talentId));
    }
}
