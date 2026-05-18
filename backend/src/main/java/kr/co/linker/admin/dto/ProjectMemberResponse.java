package kr.co.linker.admin.dto;

import kr.co.linker.talent.domain.AvailabilityStatus;
import kr.co.linker.talent.domain.TalentCategory;

import java.util.UUID;

public record ProjectMemberResponse(
        UUID memberId,
        UUID talentId,
        String talentName,
        String role,
        TalentCategory category,
        AvailabilityStatus availabilityStatus,
        String skills,
        String assignedAt
) {}
