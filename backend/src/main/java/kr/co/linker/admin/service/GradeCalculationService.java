package kr.co.linker.admin.service;

import kr.co.linker.talent.domain.TalentExperience;
import kr.co.linker.talent.domain.TalentProfile;
import kr.co.linker.talent.repository.TalentExperienceRepository;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * SW산업진흥법 기술자 등급 자동 산정.
 * 자격증 수준(CertLevel) + IT 경력 개월 수를 조합해 등급을 결정한다.
 */
@Service
@RequiredArgsConstructor
public class GradeCalculationService {

    private final TalentExperienceRepository experienceRepository;
    private final TalentProfileRepository talentProfileRepository;

    /** 기술 등급 재산정 후 프로필에 반영 (JPA dirty-checking으로 자동 저장). */
    public void recalculate(UUID talentId) {
        TalentProfile profile = talentProfileRepository.findById(talentId).orElse(null);
        if (profile == null || profile.isDeleted()) return;

        List<TalentExperience> exps = experienceRepository.findByTalentProfileIdOrderByStartDateDesc(talentId);

        CertLevel bestCert = bestCertLevel(exps);
        int careerMonths = calcCareerMonths(profile, exps);
        String grade = calcGrade(bestCert, careerMonths);

        profile.updateSkillGrade(grade);
    }

    // ── 자격증 등급 분류 ──────────────────────────────────────────────────────────

    private CertLevel bestCertLevel(List<TalentExperience> exps) {
        return exps.stream()
                .filter(e -> "CERTIFICATION".equals(e.getExperienceType()))
                .map(e -> classifyCert(e.getProjectName()))
                .max(Comparator.comparingInt(c -> c.rank))
                .orElse(CertLevel.NONE);
    }

    private CertLevel classifyCert(String certName) {
        if (certName == null) return CertLevel.NONE;
        if (certName.contains("기술사"))  return CertLevel.PE;
        if (certName.contains("산업기사")) return CertLevel.INDUSTRIAL_ENGINEER;
        if (certName.contains("기사"))    return CertLevel.ENGINEER;
        if (certName.contains("기능사"))  return CertLevel.TECHNICIAN;
        return CertLevel.NONE;
    }

    // ── IT 경력 산정 ──────────────────────────────────────────────────────────────

    private int calcCareerMonths(TalentProfile profile, List<TalentExperience> exps) {
        if (profile.getItCareerMonths() != null && profile.getItCareerMonths() > 0) {
            return profile.getItCareerMonths();
        }
        LocalDate today = LocalDate.now();
        return exps.stream()
                .filter(e -> "PROJECT".equals(e.getExperienceType()) || "COMPANY".equals(e.getExperienceType()))
                .mapToInt(e -> {
                    LocalDate start = e.getStartDate();
                    LocalDate end = e.getEndDate() != null ? e.getEndDate() : today;
                    return end.isBefore(start) ? 0 : (int) ChronoUnit.MONTHS.between(start, end);
                })
                .sum();
    }

    // ── 등급 산정 (SW산업진흥법) ─────────────────────────────────────────────────

    private String calcGrade(CertLevel cert, int careerMonths) {
        int years = careerMonths / 12;

        if (cert == CertLevel.PE)                                              return "특급";
        if (cert == CertLevel.ENGINEER          && years >= 6)                 return "특급";
        if (cert == CertLevel.INDUSTRIAL_ENGINEER && years >= 8)               return "특급";
        if (years >= 10)                                                        return "특급";

        if (cert == CertLevel.ENGINEER          && years >= 3)                 return "고급";
        if (cert == CertLevel.INDUSTRIAL_ENGINEER && years >= 5)               return "고급";
        if (years >= 7)                                                         return "고급";

        if (cert == CertLevel.ENGINEER)                                        return "중급";
        if (cert == CertLevel.INDUSTRIAL_ENGINEER && years >= 2)               return "중급";
        if (years >= 4)                                                         return "중급";

        if (cert == CertLevel.INDUSTRIAL_ENGINEER)                             return "초급";
        if (cert == CertLevel.TECHNICIAN         && years >= 1)                return "초급";
        if (years >= 2)                                                         return "초급";

        if (cert != CertLevel.NONE || years > 0)                               return "입문";
        return null;
    }

    private enum CertLevel {
        NONE(0), TECHNICIAN(1), INDUSTRIAL_ENGINEER(2), ENGINEER(3), PE(4);
        final int rank;
        CertLevel(int rank) { this.rank = rank; }
    }
}
