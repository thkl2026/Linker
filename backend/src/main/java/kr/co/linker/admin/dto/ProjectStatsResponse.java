package kr.co.linker.admin.dto;

public record ProjectStatsResponse(
        long total,
        long open,
        long matched
) {}
