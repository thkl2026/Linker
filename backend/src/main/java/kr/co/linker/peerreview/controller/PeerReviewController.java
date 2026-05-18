package kr.co.linker.peerreview.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.peerreview.dto.CreatePeerReviewRequest;
import kr.co.linker.peerreview.dto.PeerReviewResponse;
import kr.co.linker.peerreview.service.PeerReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 익명 다면 평가 API 컨트롤러 (F-4.5)
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "PeerReview", description = "익명 동료 평가 API")
@RestController
@RequestMapping("/api/v1/peer-reviews")
@RequiredArgsConstructor
public class PeerReviewController {

    private final PeerReviewService peerReviewService;

    /**
     * Peer Review를 등록한다 (F-4.5).
     *
     * <p>자기 자신 평가 불가. 계약당 1인 1회 제한.
     * 익명 여부는 요청자가 선택한다.
     *
     * @param reviewerId 인증된 평가자 UUID
     * @param request    평가 요청
     * @return 등록된 Peer Review
     */
    @Operation(summary = "Peer Review 등록 (F-4.5)")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PeerReviewResponse> create(
            @AuthenticationPrincipal UUID reviewerId,
            @Valid @RequestBody CreatePeerReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(peerReviewService.create(reviewerId, request));
    }

    /**
     * 인력의 Peer Review 목록을 반환한다.
     *
     * <p>익명 평가의 경우 ADMIN을 제외하면 reviewerId가 마스킹된다.
     *
     * @param talentId   인력 UUID
     * @param requesterId 요청자 UUID
     * @return Peer Review 목록
     */
    @Operation(summary = "인력 Peer Review 목록 조회")
    @GetMapping("/by-talent/{talentId}")
    @PreAuthorize("hasAnyRole('PM', 'PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<List<PeerReviewResponse>> listByTalent(
            @PathVariable UUID talentId,
            @AuthenticationPrincipal UUID requesterId) {
        boolean isAdmin = false;  // SecurityContext에서 역할 확인은 AOP로 처리
        return ResponseEntity.ok(
                peerReviewService.listByTalent(talentId, requesterId, isAdmin));
    }

    /**
     * 인력의 Peer Review 평균 점수를 반환한다.
     *
     * @param talentId 인력 UUID
     * @return 평균 점수
     */
    @Operation(summary = "인력 Peer Review 평균 점수 조회")
    @GetMapping("/by-talent/{talentId}/average")
    @PreAuthorize("hasAnyRole('PM', 'PROCUREMENT', 'SERVICE_ADMIN', 'TALENT')")
    public ResponseEntity<Map<String, Double>> getAverage(@PathVariable UUID talentId) {
        return ResponseEntity.ok(Map.of("averageScore",
                peerReviewService.getAverageScore(talentId)));
    }
}
