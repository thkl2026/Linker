package kr.co.linker.talent.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Pre-signed URL 발급 요청 DTO
 *
 * @param filename  원본 파일명 (확장자 포함)
 * @param mimeType  MIME 타입 (허용: application/pdf, image/jpeg, image/png)
 */
public record PresignedUrlRequest(
        @NotBlank String filename,
        @NotBlank
        @Pattern(regexp = "application/pdf|image/jpeg|image/png",
                 message = "허용된 파일 형식: PDF, JPEG, PNG")
        String mimeType
) {}
