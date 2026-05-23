package kr.co.linker.admin.dto;

import java.util.List;

public record RevenueReportDto(
        long totalMonthly,
        double avgRate,
        List<MonthAmount> byMonth,
        List<RateBand> byRateBand,
        List<ReferralCount> byReferral
) {
    public record MonthAmount(String month, long amount) {}
    public record RateBand(String label, long count) {}
    public record ReferralCount(String name, long count, int pct) {}
}
