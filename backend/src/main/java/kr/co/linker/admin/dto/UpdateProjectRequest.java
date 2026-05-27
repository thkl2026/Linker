package kr.co.linker.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateProjectRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 200) String clientCompany,
        @Size(max = 200) String mainContractor,
        LocalDate startDate,
        LocalDate endDate,
        Integer requiredHeadcount,
        String workType,
        String description,
        BigDecimal budgetMin,
        BigDecimal budgetMax
) {}
