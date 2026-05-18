package kr.co.linker.admin.dto;

public record EvaluationStatsResponse(
        double avgScore,
        long pendingCount,
        long highPerformerCount,
        long monthlyFeedbackCount,
        double completionRate
) {}
