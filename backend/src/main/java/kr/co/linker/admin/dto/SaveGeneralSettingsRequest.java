package kr.co.linker.admin.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record SaveGeneralSettingsRequest(
        @NotBlank @Size(max = 255) String platformName,
        String contactPhone,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal feeRate,
        String logoUrl,
        String companyLogoUrl
) {}
