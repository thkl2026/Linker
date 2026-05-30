package kr.co.linker.admin.dto;

import jakarta.validation.constraints.Size;

public record UpdateInvitedUserRequest(
        @Size(max = 100) String name,
        @Size(max = 200) String company,
        @Size(max = 50) String role
) {}
