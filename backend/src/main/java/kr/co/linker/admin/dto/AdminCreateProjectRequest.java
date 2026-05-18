package kr.co.linker.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record AdminCreateProjectRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 200) String clientCompany,
        @Size(max = 200) String mainContractor,
        LocalDate startDate,
        LocalDate endDate,
        String requiredSkills,
        Integer requiredHeadcount,
        UUID pmId
) {}
