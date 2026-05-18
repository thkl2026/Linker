package kr.co.linker.admin.dto;

import java.util.List;

public record DashboardStatsResponse(
        long totalTalents,
        long activeProjects,
        List<LabelCount> categoryDist,
        List<LabelCount> gradeDist,
        List<LabelCount> evalDist,
        List<MonthlyCount> monthlyTrend
) {
    public record LabelCount(String label, long count) {}
    public record MonthlyCount(String month, long count) {}
}
