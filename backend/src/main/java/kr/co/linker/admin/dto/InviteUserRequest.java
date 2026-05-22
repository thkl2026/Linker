package kr.co.linker.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record InviteUserRequest(
        @NotBlank @Email String email,
        String company,
        @NotBlank String role
) {}
