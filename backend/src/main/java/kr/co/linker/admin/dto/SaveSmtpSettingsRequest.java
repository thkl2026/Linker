package kr.co.linker.admin.dto;

public record SaveSmtpSettingsRequest(
        String host,
        Integer port,
        String username,
        String password
) {}
