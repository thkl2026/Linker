package kr.co.linker.admin.dto;

import kr.co.linker.admin.domain.UserInvitation;

import java.util.UUID;

public record InvitedUserResponse(
        UUID id,
        String email,
        String role,
        String status,
        String invitedAt,
        String acceptedAt
) {
    public static InvitedUserResponse from(UserInvitation inv) {
        return new InvitedUserResponse(
                inv.getId(),
                inv.getEmail(),
                inv.getRole(),
                inv.getStatus(),
                inv.getInvitedAt() != null ? inv.getInvitedAt().toString() : null,
                inv.getAcceptedAt() != null ? inv.getAcceptedAt().toString() : null
        );
    }
}
