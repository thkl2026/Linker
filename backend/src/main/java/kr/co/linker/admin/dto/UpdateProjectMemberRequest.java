package kr.co.linker.admin.dto;

import java.math.BigDecimal;

public record UpdateProjectMemberRequest(
        String role,
        BigDecimal proposedPrice,
        BigDecimal talentSalary
) {}
