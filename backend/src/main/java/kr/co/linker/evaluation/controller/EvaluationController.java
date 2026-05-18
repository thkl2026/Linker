package kr.co.linker.evaluation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.evaluation.dto.CreateEvaluationRequest;
import kr.co.linker.evaluation.dto.EvaluationResponse;
import kr.co.linker.evaluation.service.EvaluationService;
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
 * 평가 API 컨트롤러 (F-4.2)
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "Evaluation", description = "계약 평가 등록·조회 API (AI 구조화 분석 포함)")
@RestController
@RequestMapping("/api/v1/evaluations")
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService evaluationService;

    /**
     * 평가 등록 — AI가 자유 형식 피드백을 즉시 구조화한다.
     *
     * @param userDetails 인증된 평가자
     * @param request     평가 등록 요청
     * @return 201 Created + EvaluationResponse
     */
    @Operation(summary = "평가 등록 (F-4.2) — AI 피드백 구조화 포함")
    @PostMapping
    @PreAuthorize("hasAnyRole('PM', 'TALENT', 'SERVICE_ADMIN')")
    public ResponseEntity<EvaluationResponse> create(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateEvaluationRequest request) {
        UUID evaluatorId = UUID.fromString(userDetails.getUsername());
        EvaluationResponse response = evaluationService.create(evaluatorId, request);
        return ResponseEntity.created(URI.create("/api/v1/evaluations/" + response.id())).body(response);
    }

    /**
     * 계약별 평가 목록 조회
     *
     * @param contractId 계약 UUID
     * @return 평가 목록
     */
    @Operation(summary = "계약별 평가 목록")
    @GetMapping("/by-contract/{contractId}")
    @PreAuthorize("hasAnyRole('PM', 'PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<List<EvaluationResponse>> listByContract(@PathVariable UUID contractId) {
        return ResponseEntity.ok(evaluationService.listByContract(contractId));
    }
}
