package kr.co.linker.admin.service;

import kr.co.linker.admin.dto.EvalReportDto;
import kr.co.linker.admin.dto.ProjectReportDto;
import kr.co.linker.admin.dto.RevenueReportDto;
import kr.co.linker.admin.dto.TalentReportDto;
import kr.co.linker.common.encryption.EncryptionService;
import kr.co.linker.peerreview.repository.PeerReviewRepository;
import kr.co.linker.project.domain.ProjectStatus;
import kr.co.linker.project.repository.ProjectMemberRepository;
import kr.co.linker.project.repository.ProjectOpportunityRepository;
import kr.co.linker.talent.domain.AvailabilityStatus;
import kr.co.linker.talent.domain.TalentCategory;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportsService {

    private final TalentProfileRepository talentRepo;
    private final ProjectOpportunityRepository projectRepo;
    private final ProjectMemberRepository memberRepo;
    private final PeerReviewRepository peerReviewRepo;
    private final EncryptionService encryptionService;

    private Instant periodStart(String period) {
        return switch (period) {
            case "1m" -> Instant.now().minus(30, ChronoUnit.DAYS);
            case "3m" -> Instant.now().minus(90, ChronoUnit.DAYS);
            case "1y" -> Instant.now().minus(365, ChronoUnit.DAYS);
            default   -> Instant.now().minus(180, ChronoUnit.DAYS); // 6m
        };
    }

    // ── 인력 현황 ───────────────────────────────────────────────────────────────

    public TalentReportDto talentReport(String period) {
        Instant since = periodStart(period);

        long total     = talentRepo.countByDeletedAtIsNull();
        long available = talentRepo.countByAvailabilityStatusAndDeletedAtIsNull(AvailabilityStatus.AVAILABLE);
        long busy      = talentRepo.countByAvailabilityStatusAndDeletedAtIsNull(AvailabilityStatus.BUSY);
        long rest      = talentRepo.countByAvailabilityStatusAndDeletedAtIsNull(AvailabilityStatus.REST);
        long newCount  = talentRepo.countByCreatedAtAfterAndDeletedAtIsNull(OffsetDateTime.ofInstant(since, java.time.ZoneOffset.UTC));
        double avgRate = toDouble(talentRepo.avgDesiredRate());

        List<TalentReportDto.LabelCount> byCategory = talentRepo.countByCategory().stream()
                .map(r -> new TalentReportDto.LabelCount(categoryLabel((TalentCategory) r[0]), (Long) r[1]))
                .toList();

        List<TalentReportDto.LabelCount> byGrade = talentRepo.countBySkillGrade().stream()
                .map(r -> {
                    String g = (String) r[0];
                    return new TalentReportDto.LabelCount(g == null || g.isBlank() ? "미등록" : g, (Long) r[1]);
                })
                .toList();

        List<TalentReportDto.MonthCount> monthlyNew = talentRepo.countMonthlyNewSince(since).stream()
                .map(r -> new TalentReportDto.MonthCount(formatMonth((String) r[0]), toLong(r[1])))
                .toList();

        List<TalentReportDto.SkillCount> topSkills = talentRepo.topSkills().stream()
                .map(r -> new TalentReportDto.SkillCount((String) r[0], toLong(r[1])))
                .toList();

        return new TalentReportDto(total, available, busy, rest, newCount, avgRate,
                byCategory, byGrade, monthlyNew, topSkills);
    }

    // ── 프로젝트 현황 ───────────────────────────────────────────────────────────

    public ProjectReportDto projectReport(String period) {
        Instant since = periodStart(period);

        long total     = projectRepo.count();
        long open      = projectRepo.countByStatus(ProjectStatus.OPEN);
        long matched   = projectRepo.countByStatus(ProjectStatus.MATCHED);
        long closed    = projectRepo.countByStatus(ProjectStatus.CLOSED);
        long cancelled = projectRepo.countByStatus(ProjectStatus.CANCELLED);
        double avgHead = toDouble(projectRepo.avgRequiredHeadcount());

        List<ProjectReportDto.MonthOpenClosed> byMonth = projectRepo.countMonthlyOpenClosed(since).stream()
                .map(r -> new ProjectReportDto.MonthOpenClosed(
                        formatMonth((String) r[0]), toLong(r[1]), toLong(r[2])))
                .toList();

        List<ProjectReportDto.ClientCount> topClients = projectRepo.topClientsByCount().stream()
                .map(r -> new ProjectReportDto.ClientCount(
                        (String) r[0], toLong(r[1]), toDouble(r[2])))
                .toList();

        List<ProjectReportDto.LabelCount> byWorkType = projectRepo.countByWorkType().stream()
                .map(r -> new ProjectReportDto.LabelCount(workTypeLabel((String) r[0]), toLong(r[1])))
                .toList();

        return new ProjectReportDto(total, open, matched, closed, cancelled, avgHead,
                byMonth, topClients, byWorkType);
    }

    // ── 매출 분석 ───────────────────────────────────────────────────────────────

    public RevenueReportDto revenueReport(String period) {
        Instant since = periodStart(period);

        double avgRate   = toDouble(talentRepo.avgDesiredRate());
        long totalMonthly = Math.round(avgRate * talentRepo.countByAvailabilityStatusAndDeletedAtIsNull(AvailabilityStatus.BUSY));

        List<RevenueReportDto.MonthAmount> byMonth = memberRepo.monthlyRevenue(since).stream()
                .map(r -> new RevenueReportDto.MonthAmount(formatMonth((String) r[0]), toLong(r[1])))
                .toList();

        List<RevenueReportDto.RateBand> byRateBand = talentRepo.countByRateBand().stream()
                .map(r -> new RevenueReportDto.RateBand((String) r[0], toLong(r[2])))
                .toList();

        List<Object[]> referralRaw = talentRepo.countByReferralSource();
        long referralTotal = referralRaw.stream().mapToLong(r -> toLong(r[1])).sum();
        List<RevenueReportDto.ReferralCount> byReferral = referralRaw.stream()
                .map(r -> {
                    long cnt = toLong(r[1]);
                    int pct = referralTotal == 0 ? 0 : (int) Math.round(cnt * 100.0 / referralTotal);
                    return new RevenueReportDto.ReferralCount((String) r[0], cnt, pct);
                })
                .toList();

        return new RevenueReportDto(totalMonthly, avgRate, byMonth, byRateBand, byReferral);
    }

    // ── 평가 분석 ───────────────────────────────────────────────────────────────

    public EvalReportDto evalReport(String period) {
        Instant since = periodStart(period);

        long totalReviews = peerReviewRepo.count();
        long highPerformers = peerReviewRepo.countTalentsByMinAvgScore(4.5).stream()
                .mapToLong(Long::longValue).sum();

        Object[] dims = peerReviewRepo.avgScoresByDimension();
        double avgCollab   = toDouble(dims[0]);
        double avgTech     = toDouble(dims[1]);
        double avgReliable = toDouble(dims[2]);
        double avgScore    = Math.round((avgCollab + avgTech + avgReliable) / 3.0 * 10) / 10.0;

        List<EvalReportDto.MonthAvg> byMonth = peerReviewRepo.avgScoreMonthly(since).stream()
                .map(r -> new EvalReportDto.MonthAvg(formatMonth((String) r[0]),
                        Math.round(toDouble(r[1]) * 10) / 10.0))
                .toList();

        List<EvalReportDto.TopTalent> topTalents = buildTopTalents();

        List<EvalReportDto.LabelCount> distribution = peerReviewRepo.scoreDistribution().stream()
                .map(r -> new EvalReportDto.LabelCount((String) r[0], toLong(r[2])))
                .toList();

        return new EvalReportDto(avgScore, totalReviews, highPerformers,
                Math.round(avgCollab * 10) / 10.0,
                Math.round(avgTech * 10) / 10.0,
                Math.round(avgReliable * 10) / 10.0,
                byMonth, topTalents, distribution);
    }

    private List<EvalReportDto.TopTalent> buildTopTalents() {
        List<Object[]> rows = peerReviewRepo.topTalentsByAvgScore(PageRequest.of(0, 5));
        List<EvalReportDto.TopTalent> result = new ArrayList<>();
        for (Object[] r : rows) {
            UUID talentId = (UUID) r[0];
            double score  = Math.round(toDouble(r[1]) * 10) / 10.0;
            long reviews  = toLong(r[2]);
            talentRepo.findById(talentId).ifPresent(t ->
                    result.add(new EvalReportDto.TopTalent(
                            maskName(decryptName(t)),
                            categoryLabel(t.getCategory()),
                            t.getSkillGrade() != null ? t.getSkillGrade() : "-",
                            score, reviews)));
        }
        return result;
    }

    // ── 공통 헬퍼 ───────────────────────────────────────────────────────────────

    private String decryptName(TalentProfile t) {
        if (t.getName() == null) return "익명";
        try { return encryptionService.decrypt(t.getName()); }
        catch (Exception e) { return t.getName(); }
    }

    private String maskName(String name) {
        if (name == null || name.isBlank()) return "익명";
        String s = name.strip();
        return s.length() <= 1 ? s : s.charAt(0) + "**";
    }

    private String categoryLabel(TalentCategory c) {
        if (c == null) return "기타";
        return switch (c) {
            case DEVELOPER  -> "개발자";
            case ARCHITECT  -> "AA";
            case DBA        -> "DBA";
            case PM         -> "PM";
            case ANALYST    -> "DA";
            case DESIGNER   -> "UI/UX";
            case PLANNER    -> "기획자";
        };
    }

    private String workTypeLabel(String wt) {
        if (wt == null) return "기타";
        return switch (wt.toUpperCase()) {
            case "ONSITE" -> "상주";
            case "REMOTE" -> "재택";
            case "HYBRID" -> "혼합";
            default       -> wt;
        };
    }

    private String formatMonth(String yyyyMm) {
        if (yyyyMm == null || yyyyMm.length() < 7) return yyyyMm;
        int month = Integer.parseInt(yyyyMm.substring(5, 7));
        return month + "월";
    }

    private long toLong(Object v) {
        if (v == null) return 0L;
        return ((Number) v).longValue();
    }

    private double toDouble(Object v) {
        if (v == null) return 0.0;
        return Math.round(((Number) v).doubleValue() * 10) / 10.0;
    }
}
