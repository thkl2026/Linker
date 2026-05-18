package kr.co.linker.timesheet.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.timesheet.domain.TimesheetStatus;
import kr.co.linker.timesheet.dto.SubmitTimesheetRequest;
import kr.co.linker.timesheet.dto.TimesheetResponse;
import kr.co.linker.timesheet.service.TimesheetService;
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
 * 타임시트 API 컨트롤러 (F-3.3)
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "Timesheet", description = "타임시트 등록·승인 워크플로우 API")
@RestController
@RequestMapping("/api/v1/timesheets")
@RequiredArgsConstructor
public class TimesheetController {

    private final TimesheetService timesheetService;

    /**
     * 타임시트 등록 (TALENT 전용)
     *
     * @param userDetails 인증된 인력 사용자
     * @param request     타임시트 등록 요청
     * @return 201 Created
     */
    @Operation(summary = "타임시트 등록 (F-3.3)")
    @PostMapping
    @PreAuthorize("hasRole('TALENT')")
    public ResponseEntity<TimesheetResponse> submit(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SubmitTimesheetRequest request) {
        UUID talentId = UUID.fromString(userDetails.getUsername());
        TimesheetResponse response = timesheetService.submit(talentId, request);
        return ResponseEntity.created(URI.create("/api/v1/timesheets/" + response.id())).body(response);
    }

    /**
     * 계약별 타임시트 목록 조회
     *
     * @param contractId 계약 UUID
     * @param status     상태 필터 (선택)
     * @return 타임시트 목록
     */
    @Operation(summary = "계약별 타임시트 목록")
    @GetMapping("/by-contract/{contractId}")
    @PreAuthorize("hasAnyRole('PM', 'PROCUREMENT', 'SERVICE_ADMIN')")
    public ResponseEntity<List<TimesheetResponse>> listByContract(
            @PathVariable UUID contractId,
            @RequestParam(required = false) TimesheetStatus status) {
        return ResponseEntity.ok(timesheetService.listByContract(contractId, status));
    }

    /**
     * 내 타임시트 목록 조회 (TALENT 전용)
     *
     * @param userDetails 인증된 인력 사용자
     * @return 타임시트 목록
     */
    @Operation(summary = "내 타임시트 목록")
    @GetMapping("/my")
    @PreAuthorize("hasRole('TALENT')")
    public ResponseEntity<List<TimesheetResponse>> listMy(
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID talentId = UUID.fromString(userDetails.getUsername());
        return ResponseEntity.ok(timesheetService.listByTalent(talentId));
    }

    /**
     * 타임시트 승인 (PM/ADMIN)
     *
     * @param timesheetId 타임시트 UUID
     * @param userDetails 승인자
     * @return 업데이트된 타임시트
     */
    @Operation(summary = "타임시트 승인")
    @PutMapping("/{timesheetId}/approve")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN')")
    public ResponseEntity<TimesheetResponse> approve(
            @PathVariable UUID timesheetId,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID approverId = UUID.fromString(userDetails.getUsername());
        return ResponseEntity.ok(timesheetService.approve(timesheetId, approverId));
    }

    /**
     * 타임시트 반려 (PM/ADMIN)
     *
     * @param timesheetId 타임시트 UUID
     * @return 업데이트된 타임시트
     */
    @Operation(summary = "타임시트 반려")
    @PutMapping("/{timesheetId}/reject")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN')")
    public ResponseEntity<TimesheetResponse> reject(@PathVariable UUID timesheetId) {
        return ResponseEntity.ok(timesheetService.reject(timesheetId));
    }
}
