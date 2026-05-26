package kr.co.linker.auth.dto;

/**
 * JWT 토큰 발급 응답 DTO
 *
 * @param accessToken       JWT Access Token (15분)
 * @param refreshToken      JWT Refresh Token (7일)
 * @param expiresIn         Access Token 유효 시간 (초)
 * @param role              사용자 역할
 * @param userId            사용자 UUID
 * @param name              표시 이름 (사용자 설정 이름 > 실명 > 이메일 로컬 파트)
 * @param mfaEnabled        2단계 인증 활성화 여부
 * @param identityVerified  실명인증 완료 여부
 * @param position          직책/직위
 * @param department        부서
 */
public record TokenResponse(
        String accessToken,
        String refreshToken,
        int expiresIn,
        String role,
        String userId,
        String name,
        boolean mfaEnabled,
        boolean identityVerified,
        String position,
        String department
) {}
