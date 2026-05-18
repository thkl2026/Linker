package kr.co.linker.admin.dto;

import java.util.UUID;

public record TalentEvalSummary(
        UUID   id,
        String name,
        String category,
        String field,
        String availabilityStatus,
        Double avgScore,
        long   reviewCount
) {}
