package kr.co.linker.admin.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record EvaluateProjectRequest(
        @NotNull @DecimalMin("1.0") @DecimalMax("5.0") BigDecimal score,
        String note
) {}
