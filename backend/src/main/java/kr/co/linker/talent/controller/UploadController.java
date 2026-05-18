package kr.co.linker.talent.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.talent.dto.*;
import kr.co.linker.talent.service.UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * 파일 업로드 + 이력서 파싱 API (F-1.1)
 *
 * @rule 그라운드룰 Rule 3: Swagger {@code @Operation} 필수
 */
@Tag(name = "Upload", description = "Pre-signed URL 발급 + 이력서 파싱 요청 API")
@RestController
@RequestMapping("/api/v1/upload")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;

    /**
     * Pre-signed 업로드 URL 발급
     *
     * @param userId  인증된 사용자 UUID
     * @param request 파일명 + MIME 타입
     * @return Pre-signed PUT URL + fileKey
     */
    @Operation(summary = "Pre-signed 업로드 URL 발급")
    @PostMapping("/presigned")
    @PreAuthorize("hasRole('TALENT')")
    public ResponseEntity<PresignedUrlResponse> getPresignedUrl(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody PresignedUrlRequest request) {
        return ResponseEntity.ok(uploadService.generateUploadUrl(userId, request.filename()));
    }

    /**
     * 이력서 파싱 비동기 요청 (F-1.1)
     *
     * <p>클라이언트가 Pre-signed URL로 파일 업로드 완료 후 호출.
     * 202 Accepted + jobId를 반환하며, 클라이언트는 {@code /resume/status/{jobId}}로 폴링한다.
     *
     * @param userId  인증된 사용자 UUID
     * @param request 업로드된 파일 키
     * @return 202 Accepted + jobId
     */
    @Operation(summary = "이력서 파싱 요청 (F-1.1) — 비동기")
    @PostMapping("/resume")
    @PreAuthorize("hasRole('TALENT')")
    public ResponseEntity<UUID> requestResumeParse(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody ResumeParseRequest request) {
        UUID jobId = uploadService.requestResumeParse(userId, request.fileKey());
        return ResponseEntity.accepted().body(jobId);
    }

    /**
     * AI 작업 상태 폴링
     *
     * @param jobId  작업 UUID
     * @param userId 인증된 사용자 UUID
     * @return 작업 상태 (PENDING / PROCESSING / DONE / FAILED)
     */
    @Operation(summary = "AI 작업 상태 조회")
    @GetMapping("/resume/status/{jobId}")
    @PreAuthorize("hasRole('TALENT')")
    public ResponseEntity<JobStatusResponse> getJobStatus(
            @PathVariable UUID jobId,
            @AuthenticationPrincipal UUID userId) {
        return ResponseEntity.ok(uploadService.getJobStatus(jobId, userId));
    }
}
