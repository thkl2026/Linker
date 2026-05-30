package kr.co.linker.admin.service;

import kr.co.linker.admin.dto.AdminCreateProjectRequest;
import kr.co.linker.admin.dto.UpdateProjectRequest;
import kr.co.linker.admin.dto.AdminReviewRequest;
import kr.co.linker.admin.dto.AssignMemberRequest;
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
import kr.co.linker.admin.dto.ProjectMemberResponse;
import kr.co.linker.admin.dto.ProjectStatsResponse;
import kr.co.linker.admin.dto.TalentAdminResponse;
import kr.co.linker.admin.dto.TalentEvalStatsResponse;
import kr.co.linker.admin.dto.TalentEvalSummary;
import kr.co.linker.admin.dto.TalentReviewHistoryItem;
import kr.co.linker.admin.dto.UpdateAvailabilityRequest;
import kr.co.linker.admin.dto.UpdateBonusScoreRequest;
import kr.co.linker.peerreview.domain.PeerReview;
import kr.co.linker.peerreview.repository.PeerReviewRepository;
import kr.co.linker.auth.domain.User;
import kr.co.linker.auth.domain.UserRole;
import kr.co.linker.auth.repository.UserRepository;
import kr.co.linker.common.encryption.EncryptionService;
import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.common.storage.FileStorageService;
import kr.co.linker.talent.domain.AvailabilityStatus;
import kr.co.linker.talent.domain.TalentCategory;
import kr.co.linker.project.domain.ProjectMember;
import kr.co.linker.project.domain.ProjectOpportunity;
import kr.co.linker.project.domain.ProjectStatus;
import kr.co.linker.project.repository.ProjectMemberRepository;
import kr.co.linker.project.repository.ProjectOpportunityRepository;
import kr.co.linker.talent.domain.TalentExperience;
import kr.co.linker.talent.domain.TalentField;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.domain.TalentSkill;
import kr.co.linker.talent.domain.WorkType;
import kr.co.linker.notification.service.NotificationService;
import kr.co.linker.notice.dto.CreateNoticeRequest;
import kr.co.linker.notice.service.NoticeService;
import kr.co.linker.talent.repository.TalentExperienceRepository;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceAdminService {

    private final UserRepository userRepository;
    private final TalentProfileRepository talentProfileRepository;
    private final TalentExperienceRepository experienceRepository;
    private final ProjectOpportunityRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final PeerReviewRepository peerReviewRepository;
    private final EncryptionService encryptionService;
    private final NotificationService notificationService;
    private final NoticeService noticeService;
    private final FileStorageService fileStorageService;
    private final GradeCalculationService gradeCalculationService;

    @Transactional(readOnly = true)
    public Page<TalentAdminResponse> listTalents(String keyword, TalentCategory category,
                                                  TalentField field, Pageable pageable) {
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword;
        Page<TalentProfile> page = (kw == null && category == null && field == null)
                ? talentProfileRepository.findAllByDeletedAtIsNull(pageable)
                : talentProfileRepository.search(kw,
                        category != null ? category.name() : null,
                        field != null ? field.name() : null,
                        pageable);
        log.info("[SERVICE_ADMIN] listTalents keyword={} category={} field={} -> {}건",
                kw, category, field, page.getTotalElements());
        return page.map(p -> {
            String photoUrl  = p.getPhotoKey()  != null
                    ? fileStorageService.generateDownloadUrl(p.getPhotoKey(),  java.time.Duration.ofHours(1)) : null;
            String resumeUrl = p.getResumeKey() != null
                    ? fileStorageService.generateDownloadUrl(p.getResumeKey(), java.time.Duration.ofHours(1)) : null;
            return TalentAdminResponse.from(p, decryptPhone(p), photoUrl, resumeUrl);
        });
    }

    @Transactional
    public UUID createTalent(CreateTalentRequest req) {
        String userEmail;
        if (req.email() != null && !req.email().isBlank()) {
            String candidateHash = encryptionService.hash(req.email());
            // 이미 등록된 이메일이면 내부 UUID 이메일로 대체 (UNIQUE 충돌 방지)
            userEmail = userRepository.existsByEmailHash(candidateHash)
                    ? "talent_" + UUID.randomUUID() + "@internal.linker"
                    : req.email();
        } else {
            userEmail = "talent_" + UUID.randomUUID() + "@internal.linker";
        }
        String emailHash = encryptionService.hash(userEmail);
        User shadowUser = User.create(
                encryptionService.encrypt(userEmail),
                emailHash,
                null,
                UserRole.TALENT
        );
        shadowUser.deactivate();
        userRepository.save(shadowUser);

        WorkType workType = req.workType() != null ? req.workType() : WorkType.ONSITE;
        TalentProfile profile = TalentProfile.create(
                shadowUser.getId(), req.name(), req.category(), req.field(), workType);

        if (req.phone() != null && !req.phone().isBlank()) {
            profile.updatePhone(encryptionService.encrypt(req.phone()));
        }
        
        java.time.LocalDate birth = null;
        if (req.birthDate() != null && !req.birthDate().isBlank()) {
            try { birth = java.time.LocalDate.parse(req.birthDate()); } catch (Exception ignored) {}
        }
        
        profile.updateProfile(req.name(), req.nameEn(), req.desiredRate(), req.category(), req.field(), workType,
                              birth, req.email(), req.address(), req.title(), req.projectRole());

        if (req.skills() != null) {
            req.skills().forEach(skill ->
                    profile.getSkills().add(TalentSkill.of(profile, skill, "MID", null)));
        }

        if (req.itCareerMonths() != null) {
            profile.updateItCareerMonths(req.itCareerMonths());
        }
        if (req.notes() != null) {
            profile.updateNotes(req.notes());
        }
        if (req.skillGrade() != null && !req.skillGrade().isBlank()) {
            profile.updateSkillGrade(req.skillGrade());
        }
        if (req.industryExperience() != null || req.referralSource() != null) {
            profile.updateIndustryAndReferral(req.industryExperience(), req.referralSource());
        }
        if (req.photoKey() != null && !req.photoKey().isBlank()) {
            profile.updatePhotoKey(req.photoKey());
        }
        if (req.resumeKey() != null && !req.resumeKey().isBlank()) {
            profile.updateResumeKey(req.resumeKey());
        }

        profile.updateSecondaryFields(req.secondaryFields());
        talentProfileRepository.save(profile);

        // 경험치 일괄 저장 로직
        saveExperiences(profile, "EDUCATION", req.educations());
        saveExperiences(profile, "COMPANY", req.companyExps());
        saveExperiences(profile, "PROJECT", req.projectExps());
        saveExperiences(profile, "CERTIFICATION", req.certifications());

        gradeCalculationService.recalculate(profile.getId());
        log.info("[SERVICE_ADMIN] 전문가 등록 talentId={} name={}", profile.getId(), req.name());
        try {
            notificationService.create("TALENT_REGISTERED", "새 전문가 등록",
                    req.name() + " 전문가가 등록되었습니다.");
            noticeService.create(new CreateNoticeRequest(
                    "[신규 전문가] " + req.name(),
                    req.name() + " 전문가가 시스템에 등록되었습니다.",
                    "운영/시스템", false, "시스템"));
        } catch (Exception e) {
            log.warn("[SERVICE_ADMIN] 자동 공지/알림 생성 실패 name={}: {}", req.name(), e.getMessage());
        }
        return profile.getId();
    }
    
    private void saveExperiences(TalentProfile profile, String type, List<CreateTalentRequest.ExpReq> reqs) {
        if (reqs == null || reqs.isEmpty()) return;
        List<TalentExperience> exps = reqs.stream().map(r -> {
            java.time.LocalDate sDate = null;
            java.time.LocalDate eDate = null;
            try { if (r.startDate() != null && !r.startDate().isBlank()) sDate = java.time.LocalDate.parse(r.startDate()); } catch (Exception ignored) {}
            try { if (r.endDate() != null && !r.endDate().isBlank()) eDate = java.time.LocalDate.parse(r.endDate()); } catch (Exception ignored) {}
            if (sDate == null) sDate = java.time.LocalDate.now();
            return TalentExperience.create(
                    profile, type,
                    trunc(r.companyName(), 200),
                    trunc(r.projectName() != null ? r.projectName() : "-", 255),
                    trunc(r.role(), 100),
                    null, null,
                    sDate, eDate, r.description(), r.techStack()
            );
        }).toList();
        experienceRepository.saveAll(exps);
    }

    private static String trunc(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    @Transactional
    public void updateTalent(UUID talentId, CreateTalentRequest req) {
        TalentProfile profile = talentProfileRepository.findById(talentId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "TALENT_NOT_FOUND", "전문가를 찾을 수 없습니다."));

        WorkType workType = req.workType() != null ? req.workType() : profile.getWorkType();
        TalentCategory category = req.category() != null ? req.category() : profile.getCategory();
        TalentField field = req.field() != null ? req.field() : profile.getField();
        
        java.time.LocalDate birth = profile.getBirthDate();
        if (req.birthDate() != null) {
            if (req.birthDate().isBlank()) birth = null;
            else { try { birth = java.time.LocalDate.parse(req.birthDate()); } catch (Exception ignored) {} }
        }
        
        profile.updateProfile(req.name(), req.nameEn() != null ? req.nameEn() : profile.getNameEn(),
                              req.desiredRate(), category, field, workType,
                              birth, req.email() != null ? req.email() : profile.getEmail(),
                              req.address() != null ? req.address() : profile.getAddress(),
                              req.title() != null ? req.title() : profile.getTitle(),
                              req.projectRole() != null ? req.projectRole() : profile.getProjectRole());

        if (req.phone() != null && !req.phone().isBlank()) {
            profile.updatePhone(encryptionService.encrypt(req.phone()));
        }
        if (req.skills() != null) {
            profile.getSkills().clear();
            req.skills().forEach(skill ->
                    profile.getSkills().add(TalentSkill.of(profile, skill, "MID", null)));
        }
        if (req.notes() != null) {
            profile.updateNotes(req.notes());
        }
        if (req.industryExperience() != null || req.referralSource() != null) {
            profile.updateIndustryAndReferral(
                req.industryExperience() != null ? req.industryExperience() : profile.getIndustryExperience(),
                req.referralSource() != null ? req.referralSource() : profile.getReferralSource()
            );
        }
        if (req.itCareerMonths() != null) {
            profile.updateItCareerMonths(req.itCareerMonths());
        }
        if (req.photoKey() != null && !req.photoKey().isBlank()) {
            profile.updatePhotoKey(req.photoKey());
        }
        if (req.resumeKey() != null && !req.resumeKey().isBlank()) {
            profile.updateResumeKey(req.resumeKey());
        }
        if (req.secondaryFields() != null) {
            profile.updateSecondaryFields(req.secondaryFields());
        }
        gradeCalculationService.recalculate(talentId);
        log.info("[SERVICE_ADMIN] 전문가 수정 talentId={}", talentId);
        try {
            String displayName = profile.getName() != null ? profile.getName() : talentId.toString();
            notificationService.create("TALENT_UPDATED", "전문가 정보 수정",
                    displayName + " 전문가 정보가 수정되었습니다.");
        } catch (Exception e) {
            log.warn("[SERVICE_ADMIN] 수정 알림 생성 실패 talentId={}: {}", talentId, e.getMessage());
        }
    }

    @Transactional
    public void deleteTalent(UUID talentId) {
        TalentProfile profile = requireTalent(talentId);
        String displayName = profile.getName() != null ? profile.getName() : talentId.toString();
        profile.delete();
        log.info("[SERVICE_ADMIN] 전문가 삭제 talentId={}", talentId);
        try {
            notificationService.create("TALENT_DELETED", "전문가 삭제",
                    displayName + " 전문가가 삭제되었습니다.");
        } catch (Exception e) {
            log.warn("[SERVICE_ADMIN] 삭제 알림 생성 실패 talentId={}: {}", talentId, e.getMessage());
        }
    }

    @Transactional
    public void updateDesiredRate(UUID talentId, java.math.BigDecimal desiredRate) {
        TalentProfile profile = requireTalent(talentId);
        profile.updateDesiredRate(desiredRate);
        log.info("[SERVICE_ADMIN] 희망단가 변경 talentId={} rate={}", talentId, desiredRate);
    }

    @Transactional
    public void updateAvailability(UUID talentId, UpdateAvailabilityRequest req) {
        TalentProfile profile = requireTalent(talentId);
        profile.updateAvailability(req.status(), req.availableFrom());
        log.info("[SERVICE_ADMIN] 가용상태 변경 talentId={} status={}", talentId, req.status());
    }

    @Transactional
    public void updateBonusScore(UUID talentId, UpdateBonusScoreRequest req) {
        int updated = talentProfileRepository.updateBonusScoreById(talentId, req.bonusScore());
        if (updated == 0) {
            throw new LinkerException(HttpStatus.NOT_FOUND, "TALENT_NOT_FOUND", "전문가를 찾을 수 없습니다.");
        }
        if (req.comment() != null && !req.comment().isBlank()) {
            talentProfileRepository.updateNotesById(talentId, req.comment());
        }
        log.info("[SERVICE_ADMIN] 평가점수 등록 talentId={} bonusScore={}", talentId, req.bonusScore());
    }

    // ── 참여 프로젝트 ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ExperienceResponse> listExperiences(UUID talentId) {
        requireTalent(talentId);
        return experienceRepository.findByTalentProfileIdOrderByStartDateDesc(talentId)
                .stream().map(ExperienceResponse::from).toList();
    }

    @Transactional
    public UUID createExperience(UUID talentId, ExperienceRequest req) {
        TalentProfile profile = requireTalent(talentId);
        TalentExperience exp = TalentExperience.create(
                profile, req.experienceType(),
                req.companyName(), req.projectName(), req.role(),
                req.department(), req.employmentType(),
                req.startDate(), req.endDate(), req.description(), req.techStack());
        experienceRepository.save(exp);
        gradeCalculationService.recalculate(talentId);
        log.info("[SERVICE_ADMIN] 경력 등록 talentId={} type={} title={}", talentId, req.experienceType(), req.projectName());
        return exp.getId();
    }

    @Transactional
    public void updateExperience(UUID talentId, UUID expId, ExperienceRequest req) {
        TalentExperience exp = experienceRepository.findByIdAndTalentProfileId(expId, talentId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "EXPERIENCE_NOT_FOUND", "경력을 찾을 수 없습니다."));
        exp.update(req.experienceType(), req.companyName(), req.projectName(), req.role(),
                req.department(), req.employmentType(),
                req.startDate(), req.endDate(), req.description(), req.techStack());
        gradeCalculationService.recalculate(talentId);
        log.info("[SERVICE_ADMIN] 경력 수정 expId={}", expId);
    }

    @Transactional
    public void replaceExperiences(UUID talentId, CreateTalentRequest req) {
        TalentProfile profile = requireTalent(talentId);
        experienceRepository.deleteByTalentProfileId(talentId);
        saveExperiences(profile, "EDUCATION",      req.educations());
        saveExperiences(profile, "COMPANY",        req.companyExps());
        saveExperiences(profile, "PROJECT",        req.projectExps());
        saveExperiences(profile, "CERTIFICATION",  req.certifications());
        gradeCalculationService.recalculate(talentId);
        log.info("[SERVICE_ADMIN] 경력 일괄 교체 talentId={}", talentId);
    }

    @Transactional
    public void deleteExperience(UUID talentId, UUID expId) {
        TalentExperience exp = experienceRepository.findByIdAndTalentProfileId(expId, talentId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "EXPERIENCE_NOT_FOUND", "프로젝트를 찾을 수 없습니다."));
        experienceRepository.delete(exp);
        gradeCalculationService.recalculate(talentId);
        log.info("[SERVICE_ADMIN] 프로젝트 삭제 expId={}", expId);
    }

    // ── 프로젝트 관리 ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PmUserResponse> listPmUsers() {
        return userRepository.findByRoleAndIsActiveTrue(UserRole.PM)
                .stream()
                .map(u -> {
                    String name = null;
                    if (u.getRealName() != null) {
                        try { name = encryptionService.decrypt(u.getRealName()); }
                        catch (Exception ignored) {}
                    }
                    return new PmUserResponse(u.getId(), name, u.getDepartment());
                })
                .toList();
    }

    @Transactional
    public UUID adminCreateProject(UUID adminId, AdminCreateProjectRequest req) {
        UUID pmId = req.pmId() != null ? req.pmId() : adminId;
        ProjectOpportunity project = ProjectOpportunity.create(
                pmId, req.title(), null, req.requiredSkills(), null, null, WorkType.ONSITE);
        int headcount = req.requiredHeadcount() != null ? req.requiredHeadcount() : 1;
        project.updateAdminInfo(req.clientCompany(), req.mainContractor(), headcount,
                req.startDate(), req.endDate());
        projectRepository.save(project);
        log.info("[SERVICE_ADMIN] 프로젝트 등록 projectId={} title={}", project.getId(), req.title());
        try {
            notificationService.create("PROJECT_CREATED", "새 프로젝트 등록",
                    "「" + req.title() + "」 프로젝트가 등록되었습니다.");
            String clientInfo = req.clientCompany() != null ? " | 고객사: " + req.clientCompany() : "";
            noticeService.create(new CreateNoticeRequest(
                    "[신규 프로젝트] " + req.title(),
                    "「" + req.title() + "」 프로젝트가 등록되었습니다." + clientInfo,
                    "운영/시스템", false, "시스템"));
        } catch (Exception e) {
            log.warn("[SERVICE_ADMIN] 자동 공지/알림 생성 실패 title={}: {}", req.title(), e.getMessage());
        }
        return project.getId();
    }

    @Transactional
    public void updateProject(UUID projectId, UpdateProjectRequest req) {
        ProjectOpportunity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", "프로젝트를 찾을 수 없습니다."));
        WorkType wt = req.workType() != null ? WorkType.valueOf(req.workType()) : project.getWorkType();
        int headcount = req.requiredHeadcount() != null ? req.requiredHeadcount() : project.getRequiredHeadcount();
        project.update(req.title(), req.description(), req.budgetMin(), req.budgetMax(), wt);
        project.updateAdminInfo(req.clientCompany(), req.mainContractor(), headcount, req.startDate(), req.endDate());
        log.info("[SERVICE_ADMIN] 프로젝트 수정 projectId={}", projectId);
    }

    @Transactional(readOnly = true)
    public Page<ProjectAdminResponse> listProjects(String keyword, ProjectStatus status, Pageable pageable) {
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword;
        Pageable sorted = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<ProjectOpportunity> page;
        if (kw == null && status == null) {
            page = projectRepository.findAll(sorted);
        } else if (kw == null) {
            page = projectRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        } else if (status == null) {
            page = projectRepository.searchAllNoStatus(kw, pageable);
        } else {
            page = projectRepository.searchAll(kw, status, pageable);
        }
        return page.map(p -> ProjectAdminResponse.from(p, resolvePmName(p.getPmId())));
    }

    private static final List<ProjectStatus> EVAL_STATUSES = List.of(ProjectStatus.MATCHED, ProjectStatus.CLOSED);

    @Transactional(readOnly = true)
    public EvaluationStatsResponse getEvaluationStats() {
        long total = projectRepository.countByStatusIn(EVAL_STATUSES);
        long pending = projectRepository.countByStatusInAndEvaluatedAtIsNull(EVAL_STATUSES);
        double completionRate = total == 0 ? 0 : Math.round((double)(total - pending) / total * 1000) / 10.0;
        Double avg = projectRepository.avgEvaluationScore();
        long highPerformers = projectRepository.countByEvaluationScoreGe(new java.math.BigDecimal("4.5"));
        OffsetDateTime startOfMonth = OffsetDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        long monthlyFeedbacks = projectRepository.countEvaluatedSince(startOfMonth);
        return new EvaluationStatsResponse(
                avg != null ? Math.round(avg * 10) / 10.0 : 0.0,
                pending,
                highPerformers,
                monthlyFeedbacks,
                completionRate
        );
    }

    @Transactional(readOnly = true)
    public Page<EvaluationListResponse> listEvaluations(String keyword, Boolean evaluated, Pageable pageable) {
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword;
        Page<ProjectOpportunity> page;
        if (Boolean.TRUE.equals(evaluated)) {
            page = kw != null
                    ? projectRepository.searchForEvaluationDoneByKeyword(EVAL_STATUSES, kw, pageable)
                    : projectRepository.findAllForEvaluationDone(EVAL_STATUSES, pageable);
        } else if (Boolean.FALSE.equals(evaluated)) {
            page = kw != null
                    ? projectRepository.searchForEvaluationPendingByKeyword(EVAL_STATUSES, kw, pageable)
                    : projectRepository.findAllForEvaluationPending(EVAL_STATUSES, pageable);
        } else {
            page = kw != null
                    ? projectRepository.searchForEvaluationAllByKeyword(EVAL_STATUSES, kw, pageable)
                    : projectRepository.findAllForEvaluation(EVAL_STATUSES, pageable);
        }
        return page.map(p -> EvaluationListResponse.from(p, resolvePmName(p.getPmId())));
    }

    @Transactional
    public void evaluateProject(UUID projectId, EvaluateProjectRequest req) {
        ProjectOpportunity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", "프로젝트를 찾을 수 없습니다."));
        project.evaluate(req.score(), req.note());
        log.info("[SERVICE_ADMIN] 프로젝트 평가 등록 projectId={} score={}", projectId, req.score());
    }

    @Transactional
    public void updateProjectSkills(UUID projectId, String requiredSkills) {
        ProjectOpportunity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", "프로젝트를 찾을 수 없습니다."));
        project.updateRequiredSkills(requiredSkills);
        log.info("[SERVICE_ADMIN] 필요 역할 수정 projectId={}", projectId);
    }

    @Transactional
    public void changeProjectStatus(UUID projectId, ProjectStatus newStatus) {
        ProjectOpportunity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", "프로젝트를 찾을 수 없습니다."));
        project.changeStatus(newStatus);
        log.info("[SERVICE_ADMIN] 프로젝트 상태 변경 projectId={} status={}", projectId, newStatus);
    }

    @Transactional(readOnly = true)
    public ProjectStatsResponse getProjectStats() {
        long total = projectRepository.count();
        long open = projectRepository.countByStatus(ProjectStatus.OPEN);
        long matched = projectRepository.countByStatus(ProjectStatus.MATCHED);
        return new ProjectStatsResponse(total, open, matched);
    }

    // ── 전문가 평가 (peer_reviews 기반) ────────────────────────────────────────

    @Transactional(readOnly = true)
    public TalentEvalStatsResponse getTalentEvalStats() {
        List<Object[]> rows = peerReviewRepository.findAvgScoreAndCountGroupedByTalent();
        long totalReviewed = rows.size();
        double avgScore = rows.stream()
                .mapToDouble(r -> ((Number) r[1]).doubleValue())
                .average().orElse(0.0);
        long highPerformers = rows.stream()
                .filter(r -> ((Number) r[1]).doubleValue() >= 4.5)
                .count();
        OffsetDateTime startOfMonth = OffsetDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        long monthly = peerReviewRepository.countByCreatedAtAfter(startOfMonth);
        return new TalentEvalStatsResponse(
                Math.round(avgScore * 10) / 10.0,
                totalReviewed,
                highPerformers,
                monthly
        );
    }

    @Transactional(readOnly = true)
    public Page<TalentEvalSummary> listTalentsForEvaluation(String keyword, TalentCategory category, Pageable pageable) {
        String kw = (keyword == null || keyword.isBlank()) ? null : keyword;
        Page<TalentProfile> talents = (kw == null && category == null)
                ? talentProfileRepository.findAllByDeletedAtIsNull(pageable)
                : talentProfileRepository.search(kw, category != null ? category.name() : null, null, pageable);

        java.util.Map<UUID, Object[]> statsMap = new java.util.HashMap<>();
        peerReviewRepository.findAvgScoreAndCountGroupedByTalent()
                .forEach(r -> statsMap.put((UUID) r[0], r));

        return talents.map(t -> {
            Object[] stats = statsMap.get(t.getId());
            Double avg  = stats != null ? Math.round(((Number) stats[1]).doubleValue() * 10) / 10.0 : null;
            long   cnt  = stats != null ? ((Number) stats[2]).longValue() : 0L;
            return new TalentEvalSummary(
                    t.getId(),
                    t.getName(),
                    t.getCategory() != null ? t.getCategory().name() : null,
                    t.getField()    != null ? t.getField().name()    : null,
                    t.getAvailabilityStatus().name(),
                    avg,
                    cnt
            );
        });
    }

    @Transactional
    public void submitTalentReview(UUID talentId, UUID reviewerId, AdminReviewRequest req) {
        talentProfileRepository.findById(talentId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "TALENT_NOT_FOUND", "전문가를 찾을 수 없습니다."));
        PeerReview review = PeerReview.create(
                talentId, reviewerId, null,
                req.collaborationScore(), req.technicalScore(), req.reliabilityScore(),
                req.comment(), false
        );
        peerReviewRepository.save(review);
        log.info("[SERVICE_ADMIN] 전문가 평가 등록 talentId={} reviewerId={}", talentId, reviewerId);
    }

    @Transactional(readOnly = true)
    public List<TalentReviewHistoryItem> getTalentReviewHistory(UUID talentId) {
        return peerReviewRepository.findByTalentIdOrderByCreatedAtDesc(talentId)
                .stream()
                .map(pr -> TalentReviewHistoryItem.from(pr, resolveReviewerName(pr.getReviewerId())))
                .toList();
    }

    @Transactional
    public void deleteTalentReview(UUID reviewId, UUID requesterId) {
        PeerReview review = peerReviewRepository.findById(reviewId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "REVIEW_NOT_FOUND", "평가를 찾을 수 없습니다."));
        boolean isReviewer = review.getReviewerId().equals(requesterId);
        boolean isSystemAdmin = userRepository.findById(requesterId)
                .map(u -> u.getRole() == UserRole.SYSTEM_ADMIN)
                .orElse(false);
        if (!isReviewer && !isSystemAdmin) {
            throw new LinkerException(HttpStatus.FORBIDDEN, "FORBIDDEN", "삭제 권한이 없습니다.");
        }
        peerReviewRepository.delete(review);
        log.info("[SERVICE_ADMIN] 평가 삭제 reviewId={} by={}", reviewId, requesterId);
    }

    private String resolveReviewerName(UUID reviewerId) {
        return userRepository.findById(reviewerId)
                .map(u -> {
                    if (u.getRealName() == null) return "관리자";
                    try { return maskName(encryptionService.decrypt(u.getRealName())); }
                    catch (Exception e) { return "관리자"; }
                })
                .orElse("관리자");
    }

    private String maskName(String name) {
        if (name == null || name.isBlank()) return "관리자";
        String t = name.strip();
        return t.length() <= 1 ? t : t.charAt(0) + "**";
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        long totalTalents = talentProfileRepository.countByDeletedAtIsNull();
        long activeProjects = projectRepository.countByStatus(ProjectStatus.OPEN);

        List<DashboardStatsResponse.LabelCount> categoryDist = talentProfileRepository.countByCategory()
                .stream()
                .map(row -> new DashboardStatsResponse.LabelCount(
                        categoryLabel((TalentCategory) row[0]), (Long) row[1]))
                .toList();

        List<DashboardStatsResponse.LabelCount> gradeDist = talentProfileRepository.countBySkillGrade()
                .stream()
                .map(row -> {
                    String grade = (String) row[0];
                    return new DashboardStatsResponse.LabelCount(
                            (grade == null || grade.isBlank()) ? "미등록" : grade, (Long) row[1]);
                })
                .toList();

        java.math.BigDecimal SEVEN = java.math.BigDecimal.valueOf(7);
        java.math.BigDecimal FIVE  = java.math.BigDecimal.valueOf(5);
        java.math.BigDecimal THREE = java.math.BigDecimal.valueOf(3);
        java.math.BigDecimal ZERO  = java.math.BigDecimal.ZERO;
        List<DashboardStatsResponse.LabelCount> evalDist = List.of(
                new DashboardStatsResponse.LabelCount("우수",     talentProfileRepository.countByBonusScoreGe(SEVEN)),
                new DashboardStatsResponse.LabelCount("양호",     talentProfileRepository.countByBonusScoreGeLt(FIVE, SEVEN)),
                new DashboardStatsResponse.LabelCount("주의",     talentProfileRepository.countByBonusScoreGeLt(THREE, FIVE)),
                new DashboardStatsResponse.LabelCount("투입불가",  talentProfileRepository.countByBonusScoreGtLt(ZERO, THREE)),
                new DashboardStatsResponse.LabelCount("평가없음", talentProfileRepository.countByBonusScoreNullOrZero())
        );

        List<DashboardStatsResponse.MonthlyCount> monthlyTrend = talentProfileRepository.countMonthlyNew()
                .stream()
                .map(row -> new DashboardStatsResponse.MonthlyCount((String) row[0], ((Number) row[1]).longValue()))
                .toList();

        return new DashboardStatsResponse(totalTalents, activeProjects, categoryDist, gradeDist, evalDist, monthlyTrend);
    }

    // ── 프로젝트 상세 / 멤버 매핑 ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ProjectDetailResponse getProjectDetail(UUID projectId) {
        ProjectOpportunity p = projectRepository.findById(projectId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", "프로젝트를 찾을 수 없습니다."));
        List<ProjectMemberResponse> members = buildMemberResponses(projectId);
        return ProjectDetailResponse.from(p, resolvePmName(p.getPmId()), members);
    }

    @Transactional
    public UUID assignMember(UUID projectId, AssignMemberRequest req) {
        ProjectOpportunity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "PROJECT_NOT_FOUND", "프로젝트를 찾을 수 없습니다."));
        TalentProfile talent = requireTalent(req.talentId());
        if (projectMemberRepository.existsByProjectIdAndTalentId(projectId, req.talentId())) {
            throw new LinkerException(HttpStatus.CONFLICT, "ALREADY_ASSIGNED", "이미 배정된 전문가입니다.");
        }
        ProjectMember member = ProjectMember.assign(projectId, req.talentId(), req.role());
        projectMemberRepository.save(member);
        talent.updateAvailability(AvailabilityStatus.BUSY, project.getEndDate());
        log.info("[SERVICE_ADMIN] 멤버 배정 projectId={} talentId={} → BUSY until {}",
                projectId, req.talentId(), project.getEndDate());
        try {
            String talentDisplayName = decryptSafe(talent.getName());
            notificationService.create("MEMBER_ASSIGNED", "프로젝트 투입",
                    talentDisplayName + " 전문가가 「" + project.getTitle() + "」에 배정되었습니다.");
        } catch (Exception e) {
            log.warn("[SERVICE_ADMIN] 배정 알림 생성 실패 projectId={} talentId={}: {}", projectId, req.talentId(), e.getMessage());
        }
        return member.getId();
    }

    @Transactional
    public void removeMember(UUID projectId, UUID memberId) {
        ProjectMember member = projectMemberRepository.findById(memberId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "MEMBER_NOT_FOUND", "배정 정보를 찾을 수 없습니다."));
        if (!member.getProjectId().equals(projectId)) {
            throw new LinkerException(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "잘못된 요청입니다.");
        }
        projectMemberRepository.delete(member);
        log.info("[SERVICE_ADMIN] 멤버 배정 해제 projectId={} memberId={}", projectId, memberId);
    }

    private List<ProjectMemberResponse> buildMemberResponses(UUID projectId) {
        return projectMemberRepository.findByProjectId(projectId).stream()
                .map(m -> {
                    TalentProfile t = talentProfileRepository.findById(m.getTalentId()).orElse(null);
                    String skills = t == null ? "" : t.getSkills().stream()
                            .map(TalentSkill::getSkillName)
                            .collect(Collectors.joining(", "));
                    return new ProjectMemberResponse(
                            m.getId(),
                            m.getTalentId(),
                            t != null ? t.getName() : "Unknown",
                            m.getRole(),
                            t != null ? t.getCategory() : null,
                            t != null ? t.getAvailabilityStatus() : null,
                            skills,
                            m.getAssignedAt() != null ? m.getAssignedAt().toString() : null
                    );
                }).toList();
    }

    private String categoryLabel(TalentCategory cat) {
        if (cat == null) return "기타";
        return switch (cat) {
            case DEVELOPER -> "개발자";
            case ARCHITECT -> "아키텍트";
            case DATA      -> "데이터";
            case SECURITY  -> "보안";
            case PM        -> "사업관리";
            case DESIGNER  -> "UI/UX";
        };
    }

    private String resolvePmName(UUID pmId) {
        return userRepository.findById(pmId)
                .map(u -> {
                    if (u.getRealName() == null) return null;
                    try { return encryptionService.decrypt(u.getRealName()); }
                    catch (Exception e) { return null; }
                })
                .orElse(null);
    }

    private TalentProfile requireTalent(UUID talentId) {
        return talentProfileRepository.findById(talentId)
                .filter(p -> !p.isDeleted())
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "TALENT_NOT_FOUND", "전문가를 찾을 수 없습니다."));
    }

    private String decryptPhone(TalentProfile p) {
        if (p.getPhone() == null) return null;
        try { return encryptionService.decrypt(p.getPhone()); }
        catch (Exception e) { return "***"; }
    }

    private String decryptSafe(String encrypted) {
        if (encrypted == null) return "알 수 없음";
        try { return encryptionService.decrypt(encrypted); }
        catch (Exception e) { return encrypted; }
    }

    @Transactional
    public void recalculateAllTalentGrades() {
        List<TalentProfile> activeTalents = talentProfileRepository.findByDeletedAtIsNull();
        long updatedCount = 0;
        for (TalentProfile profile : activeTalents) {
            gradeCalculationService.recalculate(profile.getId());
            updatedCount++;
        }
        log.info("[SERVICE_ADMIN] 전문가 기술 등급 일괄 재산정 완료. 대상 건수={}", updatedCount);
    }
}
