package kr.co.linker.admin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.admin.dto.AdminCreateProjectRequest;
import kr.co.linker.admin.dto.AssignMemberRequest;
import kr.co.linker.admin.dto.ChangeProjectStatusRequest;
import kr.co.linker.admin.dto.CreateTalentRequest;
import kr.co.linker.admin.dto.DashboardStatsResponse;
import kr.co.linker.admin.dto.EvaluateProjectRequest;
import kr.co.linker.admin.dto.EvaluationListResponse;
import kr.co.linker.admin.dto.EvaluationStatsResponse;
import kr.co.linker.admin.dto.ExperienceRequest;
import kr.co.linker.admin.dto.ExperienceResponse;
import kr.co.linker.admin.dto.PmUserResponse;
import kr.co.linker.admin.dto.ProjectAdminResponse;
import kr.co.linker.admin.dto.ProjectDetailResponse;
import kr.co.linker.admin.dto.ProjectStatsResponse;
import kr.co.linker.admin.dto.ResumeAnalysisResult;
import kr.co.linker.admin.dto.TalentAdminResponse;
import kr.co.linker.admin.dto.TalentInsightData;
import kr.co.linker.admin.service.TalentInsightService;
import kr.co.linker.admin.dto.UpdateAvailabilityRequest;
import kr.co.linker.admin.dto.UpdateBonusScoreRequest;
import kr.co.linker.project.domain.ProjectStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import kr.co.linker.talent.domain.TalentCategory;
import kr.co.linker.talent.domain.TalentField;
import kr.co.linker.admin.domain.ResumeAnalysisLog;
import kr.co.linker.admin.service.ResumeAnalysisService;
import kr.co.linker.admin.service.ServiceAdminService;
import kr.co.linker.common.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Tag(name = "ServiceAdmin", description = "서비스 관리자 전용 API — 전문가 경력·평가·블랙리스트")
@RestController
@RequestMapping("/api/v1/service-admin")
@PreAuthorize("hasRole('SERVICE_ADMIN')")
@RequiredArgsConstructor
public class ServiceAdminController {

    private final ServiceAdminService serviceAdminService;
    private final ResumeAnalysisService resumeAnalysisService;
    private final TalentInsightService talentInsightService;
    private final FileStorageService fileStorageService;

    // ── 프로젝트 관리 ────────────────────────────────────────────────────────

    @Operation(summary = "프로젝트 목록 조회 (통합 검색: 프로젝트명·고객사·주사업자, 상태 필터)")
    @GetMapping("/projects")
    public ResponseEntity<Page<ProjectAdminResponse>> listProjects(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) ProjectStatus status,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(serviceAdminService.listProjects(keyword, status, pageable));
    }

    @Operation(summary = "대시보드 통계 (전문가·프로젝트·분포·추이)")
    @GetMapping("/dashboard/stats")
    public ResponseEntity<DashboardStatsResponse> getDashboardStats() {
        return ResponseEntity.ok(serviceAdminService.getDashboardStats());
    }

    // ── 평가 관리 ────────────────────────────────────────────────────────────

    @Operation(summary = "평가 통계 (평균점수·미완료·우수·월별)")
    @GetMapping("/evaluations/stats")
    public ResponseEntity<EvaluationStatsResponse> getEvaluationStats() {
        return ResponseEntity.ok(serviceAdminService.getEvaluationStats());
    }

    @Operation(summary = "전문가 평가 통계 (peer review 기반)")
    @GetMapping("/evaluations/talent-stats")
    public ResponseEntity<kr.co.linker.admin.dto.TalentEvalStatsResponse> getTalentEvalStats() {
        return ResponseEntity.ok(serviceAdminService.getTalentEvalStats());
    }

    @Operation(summary = "전문가 평가 대상 목록")
    @GetMapping("/evaluations/talents")
    public ResponseEntity<Page<kr.co.linker.admin.dto.TalentEvalSummary>> listTalentsForEvaluation(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) kr.co.linker.talent.domain.TalentCategory category,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(serviceAdminService.listTalentsForEvaluation(keyword, category, pageable));
    }

    @Operation(summary = "전문가 평가 등록")
    @PostMapping("/evaluations/talents/{talentId}")
    public ResponseEntity<Void> submitTalentReview(
            @PathVariable UUID talentId,
            @Valid @RequestBody kr.co.linker.admin.dto.AdminReviewRequest req,
            @AuthenticationPrincipal UUID adminId) {
        serviceAdminService.submitTalentReview(talentId, adminId, req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "전문가 평가 이력 조회")
    @GetMapping("/evaluations/talents/{talentId}/history")
    public ResponseEntity<java.util.List<kr.co.linker.admin.dto.TalentReviewHistoryItem>> getTalentReviewHistory(
            @PathVariable UUID talentId) {
        return ResponseEntity.ok(serviceAdminService.getTalentReviewHistory(talentId));
    }

    @Operation(summary = "평가 삭제 (작성자 본인 또는 시스템 관리자)")
    @DeleteMapping("/evaluations/talents/{talentId}/history/{reviewId}")
    public ResponseEntity<Void> deleteTalentReview(
            @PathVariable UUID talentId,
            @PathVariable UUID reviewId,
            @AuthenticationPrincipal UUID requesterId) {
        serviceAdminService.deleteTalentReview(reviewId, requesterId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "평가 목록 조회 (MATCHED·CLOSED 프로젝트, 키워드·완료여부 필터)")
    @GetMapping("/evaluations")
    public ResponseEntity<Page<EvaluationListResponse>> listEvaluations(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean evaluated,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(serviceAdminService.listEvaluations(keyword, evaluated, pageable));
    }

    @Operation(summary = "프로젝트 평가 등록")
    @PatchMapping("/evaluations/{id}")
    public ResponseEntity<Void> evaluateProject(@PathVariable UUID id,
                                                 @Valid @RequestBody EvaluateProjectRequest req) {
        serviceAdminService.evaluateProject(id, req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "프로젝트 통계 (전체·모집중·모집완료)")
    @GetMapping("/projects/stats")
    public ResponseEntity<ProjectStatsResponse> getProjectStats() {
        return ResponseEntity.ok(serviceAdminService.getProjectStats());
    }

    @Operation(summary = "PM 사용자 목록 조회 (프로젝트 등록 시 PM 지정용)")
    @GetMapping("/projects/pm-list")
    public ResponseEntity<List<PmUserResponse>> listPmUsers() {
        return ResponseEntity.ok(serviceAdminService.listPmUsers());
    }

    @Operation(summary = "프로젝트 상세 조회 (멤버 목록 포함)")
    @GetMapping("/projects/{id}")
    public ResponseEntity<ProjectDetailResponse> getProjectDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(serviceAdminService.getProjectDetail(id));
    }

    @Operation(summary = "프로젝트 멤버 배정")
    @PostMapping("/projects/{id}/members")
    public ResponseEntity<UUID> assignMember(@PathVariable UUID id,
                                             @RequestBody AssignMemberRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceAdminService.assignMember(id, req));
    }

    @Operation(summary = "필요 역할 수정")
    @PatchMapping("/projects/{id}/skills")
    public ResponseEntity<Void> updateProjectSkills(@PathVariable UUID id,
                                                     @RequestBody java.util.Map<String, String> body) {
        serviceAdminService.updateProjectSkills(id, body.get("requiredSkills"));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "프로젝트 상태 변경")
    @PatchMapping("/projects/{id}/status")
    public ResponseEntity<Void> changeProjectStatus(@PathVariable UUID id,
                                                     @Valid @RequestBody ChangeProjectStatusRequest req) {
        serviceAdminService.changeProjectStatus(id, req.status());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "프로젝트 멤버 배정 해제")
    @DeleteMapping("/projects/{id}/members/{memberId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID id, @PathVariable UUID memberId) {
        serviceAdminService.removeMember(id, memberId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "신규 프로젝트 등록 (관리자)")
    @PostMapping("/projects")
    public ResponseEntity<UUID> adminCreateProject(
            @Valid @RequestBody AdminCreateProjectRequest req,
            @AuthenticationPrincipal UUID adminId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceAdminService.adminCreateProject(adminId, req));
    }

    @Operation(summary = "분석 로그 조회 (임시)")
    @PreAuthorize("permitAll()")
    @GetMapping("/resume-logs")
    public ResponseEntity<List<ResumeAnalysisLog>> getResumeLogs() {
        return ResponseEntity.ok(resumeAnalysisService.getLogs());
    }

    @Operation(summary = "전문가 목록 조회 (통합 검색: 이름·기술스택, 분류/분야 필터)")
    @GetMapping("/talents")
    public ResponseEntity<Page<TalentAdminResponse>> listTalents(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) TalentCategory category,
            @RequestParam(required = false) TalentField field,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(serviceAdminService.listTalents(keyword, category, field, pageable));
    }

    @Operation(summary = "전문가 등록")
    @PostMapping("/talents")
    public ResponseEntity<UUID> createTalent(@Valid @RequestBody CreateTalentRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceAdminService.createTalent(req));
    }

    @Operation(summary = "전문가 정보 수정")
    @PutMapping("/talents/{id}")
    public ResponseEntity<Void> updateTalent(@PathVariable UUID id,
                                              @Valid @RequestBody CreateTalentRequest req) {
        serviceAdminService.updateTalent(id, req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "전문가 삭제")
    @DeleteMapping("/talents/{id}")
    public ResponseEntity<Void> deleteTalent(@PathVariable UUID id) {
        serviceAdminService.deleteTalent(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "전문가 희망 단가 변경")
    @PatchMapping("/talents/{id}/desired-rate")
    public ResponseEntity<Void> updateDesiredRate(@PathVariable UUID id,
                                                   @RequestBody java.util.Map<String, Object> body) {
        java.math.BigDecimal rate = body.get("desiredRate") != null
                ? new java.math.BigDecimal(body.get("desiredRate").toString())
                : null;
        serviceAdminService.updateDesiredRate(id, rate);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "전문가 가용상태 변경")
    @PatchMapping("/talents/{id}/availability")
    public ResponseEntity<Void> updateAvailability(@PathVariable UUID id,
                                                    @Valid @RequestBody UpdateAvailabilityRequest req) {
        serviceAdminService.updateAvailability(id, req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "전문가 평가 등록 (보너스 점수)")
    @PatchMapping("/talents/{id}/bonus-score")
    public ResponseEntity<Void> updateBonusScore(@PathVariable UUID id,
                                                  @Valid @RequestBody UpdateBonusScoreRequest req) {
        serviceAdminService.updateBonusScore(id, req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "이력서 AI 분석 — 파일 업로드 후 폼 자동 입력용")
    @PostMapping(value = "/talents/analyze-resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResumeAnalysisResult> analyzeResume(@RequestPart("file") MultipartFile file)
            throws IOException {
        return ResponseEntity.ok(resumeAnalysisService.analyze(file));
    }

    @Operation(summary = "전문가 사진 다운로드 URL 발급")
    @GetMapping("/talents/photo-url")
    public ResponseEntity<java.util.Map<String, String>> getTalentPhotoUrl(@RequestParam String key) {
        String url = fileStorageService.generateDownloadUrl(key, java.time.Duration.ofHours(1));
        return ResponseEntity.ok(java.util.Map.of("url", url));
    }

    // ── 참여 프로젝트 ────────────────────────────────────────────────────────

    @Operation(summary = "전문가 참여 프로젝트 목록 조회")
    @GetMapping("/talents/{id}/experiences")
    public ResponseEntity<List<ExperienceResponse>> listExperiences(@PathVariable UUID id) {
        return ResponseEntity.ok(serviceAdminService.listExperiences(id));
    }

    @Operation(summary = "전문가 참여 프로젝트 등록")
    @PostMapping("/talents/{id}/experiences")
    public ResponseEntity<UUID> createExperience(@PathVariable UUID id,
                                                  @Valid @RequestBody ExperienceRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceAdminService.createExperience(id, req));
    }

    @Operation(summary = "전문가 AI 종합 분석 — 분석 후 DB 저장")
    @PostMapping("/talents/{id}/insights")
    public ResponseEntity<TalentInsightData> analyzeInsights(
            @PathVariable UUID id,
            @RequestBody(required = false) kr.co.linker.admin.dto.AnalyzeInsightsRequest req) {
        String keywords = req != null ? req.keywords() : null;
        return ResponseEntity.ok(talentInsightService.analyze(id, keywords));
    }

    @Operation(summary = "전문가 저장된 AI 분석 결과 조회")
    @GetMapping("/talents/{id}/insights")
    public ResponseEntity<TalentInsightData> getInsight(@PathVariable UUID id) {
        return ResponseEntity.ok(talentInsightService.getInsight(id));
    }

    @Operation(summary = "AI 분석 결과로 경력 일괄 교체")
    @PutMapping("/talents/{id}/experiences/bulk")
    public ResponseEntity<Void> replaceExperiences(@PathVariable UUID id,
                                                    @RequestBody CreateTalentRequest req) {
        serviceAdminService.replaceExperiences(id, req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "전문가 참여 프로젝트 수정")
    @PutMapping("/talents/{id}/experiences/{expId}")
    public ResponseEntity<Void> updateExperience(@PathVariable UUID id,
                                                  @PathVariable UUID expId,
                                                  @Valid @RequestBody ExperienceRequest req) {
        serviceAdminService.updateExperience(id, expId, req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "전문가 참여 프로젝트 삭제")
    @DeleteMapping("/talents/{id}/experiences/{expId}")
    public ResponseEntity<Void> deleteExperience(@PathVariable UUID id,
                                                  @PathVariable UUID expId) {
        serviceAdminService.deleteExperience(id, expId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "전체 전문가 기술 등급 일괄 재산정")
    @PostMapping("/talents/recalculate-grades")
    public ResponseEntity<Void> recalculateAllGrades() {
        serviceAdminService.recalculateAllTalentGrades();
        return ResponseEntity.ok().build();
    }
}
