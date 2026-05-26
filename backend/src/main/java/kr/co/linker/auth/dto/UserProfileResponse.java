package kr.co.linker.auth.dto;

/**
 * 사용자 프로필 조회 응답 DTO
 *
 * @param name        표시 이름 (사용자 직접 설정)
 * @param position    직책/직위
 * @param department  부서
 */
public record UserProfileResponse(
        String name,
        String position,
        String department
) {}
