package kr.co.linker.project.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.project.dto.CreateProjectRequest;
import kr.co.linker.project.dto.ProjectResponse;
import kr.co.linker.project.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.UUID;

/**
 * 프로젝트 기회 API 컨트롤러 (F-2.1)
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "Project", description = "프로젝트 기회 등록·조회·취소 API")
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    /**
     * 프로젝트 기회 등록 (F-2.1)
     *
     * @param pmId    인증된 PM 사용자 UUID
     * @param request 프로젝트 등록 요청
     * @return 201 Created, Location 헤더에 신규 프로젝트 URI
     */
    @Operation(summary = "프로젝트 기회 등록 (F-2.1)")
    @PostMapping
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN')")
    public ResponseEntity<Void> createProject(@AuthenticationPrincipal UUID pmId,
                                               @Valid @RequestBody CreateProjectRequest request) {
        UUID projectId = projectService.createProject(pmId, request);
        return ResponseEntity.created(URI.create("/api/v1/projects/" + projectId)).build();
    }

    /**
     * 공개 프로젝트 목록 조회 (OPEN 상태)
     *
     * @param pageable 페이지네이션 (기본 20건)
     * @return 프로젝트 페이지
     */
    @Operation(summary = "공개 프로젝트 목록 조회")
    @GetMapping
    public ResponseEntity<Page<ProjectResponse>> listOpenProjects(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(projectService.listOpenProjects(pageable));
    }

    /**
     * 내가 등록한 프로젝트 목록 조회
     *
     * @param pmId     인증된 PM 사용자 UUID
     * @param pageable 페이지네이션 (기본 20건)
     * @return 프로젝트 페이지
     */
    @Operation(summary = "내 프로젝트 목록 조회")
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN')")
    public ResponseEntity<Page<ProjectResponse>> listMyProjects(@AuthenticationPrincipal UUID pmId,
                                                                 @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(projectService.listMyProjects(pmId, pageable));
    }

    /**
     * 프로젝트 단건 조회
     *
     * @param projectId 프로젝트 UUID
     * @return 프로젝트 상세
     */
    @Operation(summary = "프로젝트 조회")
    @GetMapping("/{projectId}")
    public ResponseEntity<ProjectResponse> getProject(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectService.getProject(projectId));
    }

    /**
     * 프로젝트 취소
     *
     * @param projectId   취소할 프로젝트 UUID
     * @param requesterId 인증된 사용자 UUID (PM 본인 확인)
     * @return 204 No Content
     */
    @Operation(summary = "프로젝트 취소")
    @DeleteMapping("/{projectId}")
    @PreAuthorize("hasAnyRole('PM', 'SERVICE_ADMIN')")
    public ResponseEntity<Void> cancelProject(@PathVariable UUID projectId,
                                               @AuthenticationPrincipal UUID requesterId) {
        projectService.cancelProject(projectId, requesterId);
        return ResponseEntity.noContent().build();
    }
}
