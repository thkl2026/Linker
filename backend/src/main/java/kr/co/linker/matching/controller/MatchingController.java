package kr.co.linker.matching.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import kr.co.linker.matching.dto.MatchProposalResponse;
import kr.co.linker.matching.service.InterviewGuideService;
import kr.co.linker.matching.service.MatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * AI 매칭 API 컨트롤러 (F-2.2)
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "Matching", description = "AI 인력 매칭 제안 API")
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class MatchingController {

    private final MatchingService matchingService;
    private final InterviewGuideService interviewGuideService;

    /**
     * AI 인력 추천 생성 (F-2.2)
     *
     * <p>프로젝트 요구사항을 임베딩하여 pgvector 유사도 검색 후 LLM 매칭 이유를 생성한다.
     * 비동기 작업이므로 큐에 발행하는 방식으로 전환 예정 (현재는 동기 처리).
     *
     * @param projectId 프로젝트 UUID
     * @return 생성된 제안 수
     */
    @Operation(summary = "AI 인력 추천 생성 (F-2.2)")
    @PostMapping("/{projectId}/recommendations")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN')")
    public ResponseEntity<Map<String, Integer>> generateRecommendations(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UUID requesterId) {
        int count = matchingService.generateProposals(projectId);
        return ResponseEntity.ok(Map.of("created", count));
    }

    /**
     * 프로젝트 매칭 제안 목록 조회
     *
     * @param projectId 프로젝트 UUID
     * @param pageable  페이지네이션
     * @return 제안 페이지 (유사도 내림차순)
     */
    @Operation(summary = "매칭 제안 목록 조회")
    @GetMapping("/{projectId}/proposals")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN')")
    public ResponseEntity<Page<MatchProposalResponse>> listProposals(
            @PathVariable UUID projectId,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(matchingService.listProposals(projectId, pageable));
    }

    /**
     * 매칭 제안 수락/거절
     *
     * @param proposalId 제안 UUID
     * @param accept     true → 수락, false → 거절
     * @return 204 No Content
     */
    @Operation(summary = "매칭 제안 수락/거절")
    @PutMapping("/proposals/{proposalId}/respond")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN')")
    public ResponseEntity<Void> respond(@PathVariable UUID proposalId,
                                         @RequestParam boolean accept) {
        matchingService.respond(proposalId, accept);
        return ResponseEntity.noContent().build();
    }

    /**
     * Red-flag 기반 심층 인터뷰 가이드를 생성한다 (F-2.5).
     *
     * <p>이력 검증 실패(Red-flag)와 우려사항을 반영하여 맞춤형 질문을 생성한다.
     *
     * @param proposalId 매칭 제안 UUID
     * @return 인터뷰 가이드 (questions, warningPoints, overallRisk)
     */
    @Operation(summary = "인터뷰 가이드 자동 생성 — Red-flag 기반 (F-2.5)")
    @GetMapping("/proposals/{proposalId}/interview-guide")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN')")
    public ResponseEntity<Map<String, Object>> generateInterviewGuide(
            @PathVariable UUID proposalId) {
        return ResponseEntity.ok(interviewGuideService.generateGuide(proposalId));
    }
}
