package kr.co.linker.admin.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.util.List;

public record AllSettingsResponse(
        GeneralSettings general,
        EvaluationSettings evaluation,
        NotificationSettings notifications,
        MasterData masterData
) {
    public record GeneralSettings(String platformName, String contactPhone, BigDecimal feeRate, String logoUrl, String companyLogoUrl) {}

    public record EvaluationMetric(String name, String icon, int weight) {}
    public record EvaluationSettings(List<EvaluationMetric> metrics, BigDecimal gradeS, BigDecimal gradeA, BigDecimal gradeB) {}

    public record NotificationSettings(int evalReminderDays, boolean evalReminderEnabled, int urgentHours, boolean urgentEnabled) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Attachment(String name, String key) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReferralSource(
            String name,
            String registrationNo,
            String contactEmail,
            String phone,
            String bankAccount,
            List<Attachment> attachments
    ) {}

    public record MasterData(List<String> contractors, List<String> techStacks, List<ReferralSource> referralSources, List<String> projectRoles) {}
}
