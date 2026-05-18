package kr.co.linker.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import kr.co.linker.auth.domain.UserRole;

/**
 * 회원가입 1단계 요청 DTO — 이메일·비밀번호·역할 입력
 *
 * @param email    이메일 주소
 * @param password 비밀번호 (영문+숫자+특수문자 8자 이상)
 * @param role     가입 역할 (TALENT | PM | PROCUREMENT)
 */
public record RegisterInitiateRequest(
        @NotBlank @Email
        String email,

        @NotBlank
        @Size(min = 8, max = 100)
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$",
                message = "영문·숫자·특수문자를 각 1개 이상 포함하여 8자 이상 입력하세요."
        )
        String password,

        UserRole role
) {}
