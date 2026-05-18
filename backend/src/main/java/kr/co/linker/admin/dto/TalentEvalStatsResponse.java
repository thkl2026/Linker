package kr.co.linker.admin.dto;

public record TalentEvalStatsResponse(
        double avgScore,
        long   totalReviewed,
        long   highPerformerCount,
        long   monthlyCount
) {}
