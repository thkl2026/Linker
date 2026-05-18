package kr.co.linker.talent.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 이력서 파싱 요청 DTO (F-1.1)
 *
 * @param fileKey   업로드된 파일의 저장소 키 (Pre-signed URL 발급 시 받은 값)
 */
public record ResumeParseRequest(
        @NotBlank String fileKey
) {}
