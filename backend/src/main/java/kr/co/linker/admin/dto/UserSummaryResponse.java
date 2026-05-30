package kr.co.linker.admin.dto;

import kr.co.linker.auth.domain.User;
import kr.co.linker.auth.domain.UserRole;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserSummaryResponse(
        UUID id,
        String email,
        UserRole role,
        String name,
        String position,
        String department,
        boolean isActive,
        boolean isLocked,
        OffsetDateTime lastLoginAt,
        OffsetDateTime createdAt
) {
    public static UserSummaryResponse from(User user, String decryptedEmail) {
        return new UserSummaryResponse(
                user.getId(),
                decryptedEmail,
                user.getRole(),
                user.getName(),
                user.getPosition(),
                user.getDepartment(),
                user.isActive(),
                user.isLocked(),
                user.getLastLoginAt(),
                user.getCreatedAt()
        );
    }
}
