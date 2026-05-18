package kr.co.linker.admin.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record AdminReviewRequest(
        @NotNull @Min(1) @Max(5) Integer collaborationScore,
        @NotNull @Min(1) @Max(5) Integer technicalScore,
        @NotNull @Min(1) @Max(5) Integer reliabilityScore,
        String comment
) {}
