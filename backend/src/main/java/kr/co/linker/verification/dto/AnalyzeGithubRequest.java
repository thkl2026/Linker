package kr.co.linker.verification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * GitHub 자가 증명 분석 요청 DTO.
 *
 * @param githubUsername GitHub 사용자명
 */
public record AnalyzeGithubRequest(
        @NotBlank
        @Pattern(regexp = "[a-zA-Z0-9\\-]+", message = "유효한 GitHub 사용자명을 입력하세요.")
        String githubUsername
) {}
