package kr.co.linker.admin.dto;

import jakarta.validation.constraints.NotNull;
import kr.co.linker.talent.domain.AvailabilityStatus;

import java.time.LocalDate;

public record UpdateAvailabilityRequest(
        @NotNull AvailabilityStatus status,
        LocalDate availableFrom
) {}
