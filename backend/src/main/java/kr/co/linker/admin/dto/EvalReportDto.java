package kr.co.linker.admin.dto;

import java.util.List;

public record EvalReportDto(
        double avgScore,
        long totalReviews,
        long highPerformers,
        double avgCollab,
        double avgTech,
        double avgReliable,
        List<MonthAvg> byMonth,
        List<TopTalent> topTalents,
        List<LabelCount> distribution
) {
    public record MonthAvg(String month, double avg) {}
    public record TopTalent(String name, String category, String grade, double score, long reviews) {}
    public record LabelCount(String label, long count) {}
}
