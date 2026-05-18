package kr.co.linker.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TalentInsightResponse(
        String summary,
        CareerPattern careerPattern,
        TechnicalProfile technicalProfile,
        DomainProfile domainProfile,
        RoleProfile roleProfile,
        SoftSkills softSkills,
        List<RiskFlag> riskFlags,
        MarketValue marketValue,
        CareerRoadmap careerRoadmap
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CareerPattern(
            String consistency,
            String consistencyReason,
            Integer shortProjectCount,
            String shortProjectRisk,
            List<GapPeriod> gapPeriods,
            Integer avgProjectMonths,
            String persistenceLevel,
            String persistenceReason
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GapPeriod(
            String fromDate,
            String toDate,
            Integer months,
            String note
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TechnicalProfile(
            List<CoreSkill> coreSkills,
            String skillBreadth,
            String skillDepth,
            Integer modernSkillRatio,
            String stackTransitionNote
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CoreSkill(
            String skill,
            String level,
            String recency
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DomainProfile(
            String primaryDomain,
            List<DomainItem> domains,
            String domainNote,
            List<ProjectDomainAssignment> projectAssignments
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DomainItem(String name, Integer pct) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProjectDomainAssignment(String projectName, String domain) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RoleProfile(
            String primaryRole,
            Boolean hasArchitectExperience,
            Boolean hasLeadExperience,
            String roleNote
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SoftSkills(
            String leadership,
            String communication,
            String problemSolving,
            String summary
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RiskFlag(
            String type,
            String severity,
            String description
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MarketValue(
            Long estimatedMonthlyRate,
            Long rateRangeMin,
            Long rateRangeMax,
            String scarcityLevel,
            String rationale
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CareerRoadmap(
            String currentLevel,
            String nextStep,
            List<String> skillGaps,
            String recommendedPath
    ) {}
}
