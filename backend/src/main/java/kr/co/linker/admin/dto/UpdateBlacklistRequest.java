package kr.co.linker.admin.dto;

public record UpdateBlacklistRequest(
        boolean isBlacklisted,
        String reason
) {
}
