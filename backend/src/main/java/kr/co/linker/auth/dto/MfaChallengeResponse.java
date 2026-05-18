package kr.co.linker.auth.dto;

/**
 * 로그인 1단계 성공 응답 — MFA 챌린지 토큰 반환
 *
 * @param mfaChallengeToken Redis에 저장된 임시 토큰 (5분 유효)
 * @param mfaType           사용자가 설정한 MFA 방식
 */
public record MfaChallengeResponse(
        String mfaChallengeToken,
        String mfaType
) {}
