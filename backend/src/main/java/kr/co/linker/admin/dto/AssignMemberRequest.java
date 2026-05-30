package kr.co.linker.admin.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record AssignMemberRequest(
        UUID talentId,
        String role,
        BigDecimal proposedPrice,
        BigDecimal talentSalary
) {}
