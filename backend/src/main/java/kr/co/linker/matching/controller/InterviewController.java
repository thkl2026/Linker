package kr.co.linker.matching.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.matching.domain.InterviewRecord;
import kr.co.linker.matching.dto.CreateInterviewRequest;
import kr.co.linker.matching.dto.RecordInterviewResultRequest;
import kr.co.linker.matching.service.InterviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * 인터뷰 관리 API 컨트롤러 (F-2.3)
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "Interview", description = "인터뷰 일정·결과 관리 API")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;

    /**
     * 인터뷰 일정 등록
     *
     * @param proposalId 매칭 제안 UUID
     * @param request    일정 + 장소
     * @return 201 Created
     */
    @Operation(summary = "인터뷰 일정 등록 (F-2.3)")
    @PostMapping("/proposals/{proposalId}/interviews")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN')")
    public ResponseEntity<Void> schedule(@PathVariable UUID proposalId,
                                          @Valid @RequestBody CreateInterviewRequest request) {
        UUID interviewId = interviewService.schedule(proposalId, request);
        return ResponseEntity.created(URI.create("/api/v1/interviews/" + interviewId)).build();
    }

    /**
     * 제안별 인터뷰 목록 조회
     *
     * @param proposalId 매칭 제안 UUID
     * @return 인터뷰 기록 목록
     */
    @Operation(summary = "인터뷰 목록 조회")
    @GetMapping("/proposals/{proposalId}/interviews")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN', 'TALENT')")
    public ResponseEntity<List<InterviewRecord>> list(@PathVariable UUID proposalId) {
        return ResponseEntity.ok(interviewService.listByProposal(proposalId));
    }

    /**
     * 인터뷰 결과 기록
     *
     * @param interviewId 인터뷰 기록 UUID
     * @param request     결과 + 메모
     * @return 204 No Content
     */
    @Operation(summary = "인터뷰 결과 기록")
    @PutMapping("/interviews/{interviewId}/result")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN')")
    public ResponseEntity<Void> recordResult(@PathVariable UUID interviewId,
                                              @Valid @RequestBody RecordInterviewResultRequest request) {
        interviewService.recordResult(interviewId, request);
        return ResponseEntity.noContent().build();
    }
}
