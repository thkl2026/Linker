package kr.co.linker.talent.dto;

/**
 * Pre-signed URL 발급 응답 DTO
 *
 * @param uploadUrl  클라이언트가 파일을 직접 PUT 할 URL
 * @param fileKey    저장소 내 파일 경로 (이후 파싱 요청에 사용)
 * @param expiresIn  URL 유효 기간 (초)
 */
public record PresignedUrlResponse(
        String uploadUrl,
        String fileKey,
        long expiresIn
) {}
