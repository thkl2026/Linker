package kr.co.linker.admin.dto;

import jakarta.validation.constraints.Size;
import kr.co.linker.auth.domain.UserRole;

public record UpdateUserRequest(
        @Size(max = 100) String name,
        @Size(max = 100) String position,
        @Size(max = 100) String department,
        UserRole role
) {}
