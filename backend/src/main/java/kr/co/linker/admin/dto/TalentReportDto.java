package kr.co.linker.admin.dto;

import java.util.List;

public record TalentReportDto(
        long total,
        long available,
        long busy,
        long rest,
        long newThisPeriod,
        double avgRate,
        List<LabelCount> byCategory,
        List<LabelCount> byGrade,
        List<MonthCount> monthlyNew,
        List<SkillCount> topSkills
) {
    public record LabelCount(String label, long count) {}
    public record MonthCount(String month, long count) {}
    public record SkillCount(String skill, long count) {}
}
