package kr.co.linker.project.service;

import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.project.domain.ProjectOpportunity;
import kr.co.linker.project.domain.ProjectStatus;
import kr.co.linker.project.dto.CreateProjectRequest;
import kr.co.linker.project.dto.ProjectResponse;
import kr.co.linker.project.repository.ProjectOpportunityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * 프로젝트 기회 서비스 — 등록·조회·수정 비즈니스 로직
 *
 * <p>AI 인력 추천(F-2.2)은 Phase 2에서 매칭 서비스로 분리하여 구현한다.
 *
 * @rule 그라운드룰 Rule 1: @Transactional 메서드는 AOP 로그 자동 기록
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectOpportunityRepository projectRepository;

    /**
     * 프로젝트 기회 등록 (F-2.1)
     *
     * @param pmId    등록하는 PM 사용자 UUID
     * @param request 프로젝트 정보
     * @return 생성된 프로젝트 UUID
     */
    @Transactional
    public UUID createProject(UUID pmId, CreateProjectRequest request) {
        ProjectOpportunity project = ProjectOpportunity.create(
                pmId,
                request.title(),
                request.description(),
                request.requiredSkills(),
                request.budgetMin(),
                request.budgetMax(),
                request.workType()
        );
        projectRepository.save(project);
        log.info("[PROJECT_CREATED] projectId={} pmId={}", project.getId(), pmId);
        return project.getId();
    }

    /**
     * 프로젝트 단건 조회
     *
     * @param projectId 프로젝트 UUID
     * @return 프로젝트 응답 DTO
     */
    @Transactional(readOnly = true)
    public ProjectResponse getProject(UUID projectId) {
        return ProjectResponse.from(findOrThrow(projectId));
    }

    /**
     * 공개 프로젝트 목록 조회 (OPEN 상태)
     *
     * @param pageable 페이지네이션
     * @return 프로젝트 페이지
     */
    @Transactional(readOnly = true)
    public Page<ProjectResponse> listOpenProjects(Pageable pageable) {
        return projectRepository
                .findByStatusOrderByCreatedAtDesc(ProjectStatus.OPEN, pageable)
                .map(ProjectResponse::from);
    }

    /**
     * PM 본인이 등록한 프로젝트 목록 조회
     *
     * @param pmId     PM 사용자 UUID
     * @param pageable 페이지네이션
     * @return 프로젝트 페이지
     */
    @Transactional(readOnly = true)
    public Page<ProjectResponse> listMyProjects(UUID pmId, Pageable pageable) {
        return projectRepository
                .findByPmIdOrderByCreatedAtDesc(pmId, pageable)
                .map(ProjectResponse::from);
    }

    /**
     * 프로젝트 취소
     *
     * @param projectId   취소할 프로젝트 UUID
     * @param requesterId 요청자 UUID (본인 PM 확인)
     */
    @Transactional
    public void cancelProject(UUID projectId, UUID requesterId) {
        ProjectOpportunity project = findOrThrow(projectId);
        if (!project.isOwnedBy(requesterId)) {
            throw new LinkerException(HttpStatus.FORBIDDEN, "PROJECT_ACCESS_DENIED", "본인 프로젝트만 취소할 수 있습니다.");
        }
        project.cancel();
        log.info("[PROJECT_CANCELLED] projectId={}", projectId);
    }

    private ProjectOpportunity findOrThrow(UUID projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new LinkerException(
                        HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", "프로젝트를 찾을 수 없습니다."));
    }
}
