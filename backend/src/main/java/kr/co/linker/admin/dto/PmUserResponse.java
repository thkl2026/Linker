package kr.co.linker.admin.dto;

import java.util.UUID;

public record PmUserResponse(
        UUID id,
        String name,
        String department
) {}
