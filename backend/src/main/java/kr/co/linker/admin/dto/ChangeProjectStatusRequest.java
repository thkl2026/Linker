package kr.co.linker.admin.dto;

import jakarta.validation.constraints.NotNull;
import kr.co.linker.project.domain.ProjectStatus;

public record ChangeProjectStatusRequest(
        @NotNull ProjectStatus status
) {}
