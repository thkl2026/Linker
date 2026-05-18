package kr.co.linker.verification.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.verification.dto.AnalyzeGithubRequest;
import kr.co.linker.verification.dto.VerifyGithubRequest;
import kr.co.linker.verification.service.ExternalVerificationService;
import kr.co.linker.verification.service.SelfCertificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * 검증 API 컨트롤러
 *
 * <p>F-1.6: GitHub 프로젝트 실존성 검증, 학력 검증 (stub)
 * F-1.7: GitHub 자가 증명 분석 → bonus_score 부여
 */
@RestController
@RequestMapping("/api/v1/verifications")
@RequiredArgsConstructor
@Tag(name = "Verification", description = "이력 검증 및 자가 증명 API")
public class VerificationController {

    private final ExternalVerificationService externalVerificationService;
    private final SelfCertificationService selfCertificationService;

    /**
     * GitHub 저장소로 프로젝트 실존성을 검증한다 (F-1.6).
     *
     * @param experienceId 이력 UUID
     * @param request      검증 요청 (GitHub URL)
     * @return 검증 로그
     */
    @PostMapping("/experiences/{experienceId}/github")
    @PreAuthorize("hasAnyRole('PM', 'PROCUREMENT', 'SERVICE_ADMIN')")
    @Operation(summary = "GitHub 프로젝트 실존성 검증 (F-1.6)")
    public ResponseEntity<?> verifyGithubProject(
            @PathVariable UUID experienceId,
            @Valid @RequestBody VerifyGithubRequest request) {
        return ResponseEntity.ok(
                externalVerificationService.verifyGithubProject(
                        experienceId, request.githubRepoUrl()));
    }

    /**
     * 학력을 검증한다 — stub 처리 (MANUAL_REQUIRED) (F-1.6).
     *
     * @param experienceId 이력 UUID
     * @param university   대학교명
     * @param degree       학위명
     * @return 검증 로그
     */
    @PostMapping("/experiences/{experienceId}/academic")
    @PreAuthorize("hasAnyRole('PM', 'PROCUREMENT', 'SERVICE_ADMIN')")
    @Operation(summary = "학력 검증 (현재 MANUAL_REQUIRED stub) (F-1.6)")
    public ResponseEntity<?> verifyAcademic(
            @PathVariable UUID experienceId,
            @RequestParam String university,
            @RequestParam String degree) {
        return ResponseEntity.ok(
                externalVerificationService.verifyAcademic(experienceId, university, degree));
    }

    /**
     * 이력에 대한 검증 로그 목록을 반환한다.
     *
     * @param experienceId 이력 UUID
     * @return 검증 로그 목록
     */
    @GetMapping("/experiences/{experienceId}")
    @PreAuthorize("hasAnyRole('PM', 'PROCUREMENT', 'SERVICE_ADMIN', 'TALENT')")
    @Operation(summary = "이력 검증 로그 조회")
    public ResponseEntity<?> listByExperience(@PathVariable UUID experienceId) {
        return ResponseEntity.ok(
                externalVerificationService.listByExperience(experienceId));
    }

    /**
     * GitHub 활동을 분석하여 bonus_score를 부여한다 (F-1.7).
     *
     * @param user    인증된 사용자
     * @param talentId 인력 UUID
     * @param request  GitHub 사용자명
     * @return 자가 증명 분석 결과
     */
    @PostMapping("/talents/{talentId}/github-analysis")
    @PreAuthorize("hasRole('TALENT') or hasAnyRole('SERVICE_ADMIN')")
    @Operation(summary = "GitHub 자가 증명 분석 → bonus_score 부여 (F-1.7)")
    public ResponseEntity<?> analyzeGithub(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID talentId,
            @Valid @RequestBody AnalyzeGithubRequest request) {
        return ResponseEntity.ok(
                selfCertificationService.analyzeGithub(talentId, request.githubUsername()));
    }

    /**
     * 인력의 자가 증명 목록을 반환한다.
     *
     * @param talentId 인력 UUID
     * @return 자가 증명 목록
     */
    @GetMapping("/talents/{talentId}/self-certifications")
    @PreAuthorize("hasAnyRole('PM', 'PROCUREMENT', 'SERVICE_ADMIN', 'TALENT')")
    @Operation(summary = "자가 증명 목록 조회")
    public ResponseEntity<?> listSelfCertifications(@PathVariable UUID talentId) {
        return ResponseEntity.ok(selfCertificationService.listByTalent(talentId));
    }
}
