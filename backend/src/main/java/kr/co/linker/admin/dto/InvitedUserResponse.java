package kr.co.linker.admin.dto;

import kr.co.linker.admin.domain.UserInvitation;

import java.util.UUID;

public record InvitedUserResponse(
        UUID id,
        String email,
        String company,
        String role,
        String status,
        String invitedAt,
        String acceptedAt,
        String inviteUrl
) {
    public static InvitedUserResponse from(UserInvitation inv, String baseUrl) {
        return new InvitedUserResponse(
                inv.getId(),
                inv.getEmail(),
                inv.getCompany(),
                inv.getRole(),
                inv.getStatus(),
                inv.getInvitedAt() != null ? inv.getInvitedAt().toString() : null,
                inv.getAcceptedAt() != null ? inv.getAcceptedAt().toString() : null,
                inv.getToken() != null ? baseUrl + "/invite/" + inv.getToken() : null
        );
    }
}
