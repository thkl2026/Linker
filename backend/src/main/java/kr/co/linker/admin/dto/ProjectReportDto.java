package kr.co.linker.admin.dto;

import java.util.List;

public record ProjectReportDto(
        long total,
        long open,
        long matched,
        long closed,
        long cancelled,
        double avgHeadcount,
        List<MonthOpenClosed> byMonth,
        List<ClientCount> topClients,
        List<LabelCount> byWorkType
) {
    public record LabelCount(String label, long count) {}
    public record MonthOpenClosed(String month, long open, long closed) {}
    public record ClientCount(String name, long count, double rate) {}
}
