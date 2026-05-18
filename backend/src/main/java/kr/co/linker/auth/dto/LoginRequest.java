package kr.co.linker.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * 로그인 1단계 요청 DTO — 이메일·비밀번호
 *
 * @param email    이메일
 * @param password 비밀번호
 */
public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
) {}
