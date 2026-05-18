package kr.co.linker.talent.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.talent.domain.WorkType;
import kr.co.linker.talent.dto.CreateProfileRequest;
import kr.co.linker.talent.dto.TalentProfileResponse;
import kr.co.linker.talent.dto.UpdateAvailabilityRequest;
import kr.co.linker.talent.dto.UpdateProfileRequest;
import kr.co.linker.talent.service.TalentProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * 인력 프로필 API 컨트롤러
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "Talent", description = "인력 프로필·가용 상태 API")
@RestController
@RequestMapping("/api/v1/talents")
@RequiredArgsConstructor
public class TalentController {

    private final TalentProfileService talentProfileService;

    /**
     * 가용 인력 목록 검색
     *
     * @param workType 근무 형태 필터 (선택)
     * @param maxRate  최대 단가 필터 (선택)
     * @param pageable 페이지네이션 (기본 20건, totalScore DESC)
     * @return 가용 인력 페이지
     */
    @Operation(summary = "인력 프로필 최초 생성 (온보딩)")
    @PostMapping
    @PreAuthorize("hasRole('TALENT')")
    public ResponseEntity<UUID> createProfile(@AuthenticationPrincipal UUID userId,
                                              @Valid @RequestBody CreateProfileRequest request) {
        UUID profileId = talentProfileService.createProfile(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(profileId);
    }

    @Operation(summary = "가용 인력 검색")
    @GetMapping
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN', 'PROCUREMENT')")
    public ResponseEntity<Page<TalentProfileResponse>> search(
            @RequestParam(required = false) WorkType workType,
            @RequestParam(required = false) BigDecimal maxRate,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(talentProfileService.searchAvailable(workType, maxRate, pageable));
    }

    /**
     * 내 프로필 조회
     *
     * @param userId 인증된 사용자 UUID
     * @return 내 프로필
     */
    @Operation(summary = "내 프로필 조회")
    @GetMapping("/me")
    @PreAuthorize("hasRole('TALENT')")
    public ResponseEntity<TalentProfileResponse> getMyProfile(@AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(talentProfileService.getMyProfile(userId));
    }

    /**
     * 인력 프로필 단건 조회
     *
     * @param talentId 프로필 UUID
     * @return 프로필 상세
     */
    @Operation(summary = "인력 프로필 조회")
    @GetMapping("/{talentId}")
    public ResponseEntity<TalentProfileResponse> getProfile(@PathVariable UUID talentId) {
        return ResponseEntity.ok(talentProfileService.getProfile(talentId));
    }

    /**
     * 프로필 기본 정보 수정
     *
     * @param talentId 수정할 프로필 UUID
     * @param userId   인증된 사용자 UUID
     * @param request  수정 요청
     * @return 204 No Content
     */
    @Operation(summary = "프로필 수정")
    @PutMapping("/{talentId}")
    @PreAuthorize("hasRole('TALENT')")
    public ResponseEntity<Void> updateProfile(@PathVariable UUID talentId,
                                               @AuthenticationPrincipal UUID userId,
                                               @Valid @RequestBody UpdateProfileRequest request) {
        talentProfileService.updateProfile(talentId, userId, request);
        return ResponseEntity.noContent().build();
    }

    /**
     * 가용 상태 변경 (F-1.2) — 모바일 FAB 원터치 전환
     *
     * @param talentId 프로필 UUID
     * @param userId   인증된 사용자 UUID
     * @param request  상태 변경 요청
     * @return 204 No Content
     */
    @Operation(summary = "가용 상태 변경 (F-1.2)")
    @PutMapping("/{talentId}/availability")
    @PreAuthorize("hasRole('TALENT')")
    public ResponseEntity<Void> updateAvailability(@PathVariable UUID talentId,
                                                    @AuthenticationPrincipal UUID userId,
                                                    @Valid @RequestBody UpdateAvailabilityRequest request) {
        talentProfileService.updateAvailability(talentId, userId, request);
        return ResponseEntity.noContent().build();
    }

    /**
     * 내 가용 상태 변경 — 모바일 앱 전용 (talentId 불필요)
     *
     * @param userId  인증된 사용자 UUID
     * @param request 상태 변경 요청
     * @return 204 No Content
     */
    @Operation(summary = "내 가용 상태 변경 (모바일)")
    @PatchMapping("/me/availability")
    @PreAuthorize("hasRole('TALENT')")
    public ResponseEntity<Void> updateMyAvailability(@AuthenticationPrincipal UUID userId,
                                                      @Valid @RequestBody UpdateAvailabilityRequest request) {
        talentProfileService.updateMyAvailability(userId, request);
        return ResponseEntity.noContent().build();
    }
}
