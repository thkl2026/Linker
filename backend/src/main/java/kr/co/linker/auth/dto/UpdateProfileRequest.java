package kr.co.linker.auth.dto;

import jakarta.validation.constraints.Size;

/**
 * 사용자 프로필 수정 요청 DTO
 *
 * <p>null 필드는 변경하지 않음. 빈 문자열은 해당 필드를 초기화.
 *
 * @param name        표시 이름 (최대 100자, null 이면 미변경)
 * @param position    직책/직위 (최대 100자, null 이면 미변경)
 * @param department  부서 (최대 100자, null 이면 미변경)
 */
public record UpdateProfileRequest(
        @Size(max = 100) String name,
        @Size(max = 100) String position,
        @Size(max = 100) String department
) {}
