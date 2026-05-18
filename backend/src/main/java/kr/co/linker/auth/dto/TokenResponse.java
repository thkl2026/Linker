package kr.co.linker.auth.dto;

/**
 * JWT 토큰 발급 응답 DTO
 *
 * @param accessToken  JWT Access Token (15분)
 * @param refreshToken JWT Refresh Token (7일)
 * @param expiresIn    Access Token 유효 시간 (초)
 * @param role         사용자 역할
 */
public record TokenResponse(
        String accessToken,
        String refreshToken,
        int expiresIn,
        String role
) {}
