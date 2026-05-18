package kr.co.linker.admin.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateBonusScoreRequest(
        @NotNull
        @DecimalMin("0.0") @DecimalMax("10.0")
        BigDecimal bonusScore,
        String comment
) {}
