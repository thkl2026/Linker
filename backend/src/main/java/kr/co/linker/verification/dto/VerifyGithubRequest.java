package kr.co.linker.verification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * GitHub 프로젝트 검증 요청 DTO.
 *
 * @param githubRepoUrl GitHub 저장소 URL
 */
public record VerifyGithubRequest(
        @NotBlank
        @Pattern(regexp = "https://github\\.com/.+/.+",
                 message = "유효한 GitHub 저장소 URL을 입력하세요.")
        String githubRepoUrl
) {}
