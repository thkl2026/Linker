package kr.co.linker.admin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.admin.dto.AllSettingsResponse;
import kr.co.linker.admin.dto.InviteUserRequest;
import kr.co.linker.admin.dto.InvitedUserResponse;
import kr.co.linker.admin.dto.SaveEvaluationSettingsRequest;
import kr.co.linker.admin.dto.SaveGeneralSettingsRequest;
import kr.co.linker.admin.dto.SaveMasterDataRequest;
import kr.co.linker.admin.dto.SaveSmtpSettingsRequest;
import kr.co.linker.admin.dto.SaveNotificationSettingsRequest;
import kr.co.linker.admin.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Tag(name = "Settings", description = "플랫폼 설정 관리 API")
@RestController
@RequestMapping("/api/v1/service-admin/settings")
@PreAuthorize("hasRole('SERVICE_ADMIN')")
@RequiredArgsConstructor
public class SettingsController {

    private final SettingsService settingsService;

    @Operation(summary = "전체 설정 조회")
    @GetMapping
    public ResponseEntity<AllSettingsResponse> getAllSettings() {
        return ResponseEntity.ok(settingsService.getAllSettings());
    }

    @Operation(summary = "일반 설정 저장")
    @PutMapping("/general")
    public ResponseEntity<Void> saveGeneral(@Valid @RequestBody SaveGeneralSettingsRequest req) {
        settingsService.saveGeneral(req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "평가 시스템 설정 저장")
    @PutMapping("/evaluation")
    public ResponseEntity<Void> saveEvaluation(@RequestBody SaveEvaluationSettingsRequest req) {
        settingsService.saveEvaluation(req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "알림 규칙 설정 저장")
    @PutMapping("/notifications")
    public ResponseEntity<Void> saveNotifications(@RequestBody SaveNotificationSettingsRequest req) {
        settingsService.saveNotifications(req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "SMTP 메일 설정 저장")
    @PutMapping("/smtp")
    public ResponseEntity<Void> saveSmtp(@RequestBody SaveSmtpSettingsRequest req) {
        settingsService.saveSmtp(req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "마스터 데이터 저장")
    @PutMapping("/master-data")
    public ResponseEntity<Void> saveMasterData(@RequestBody SaveMasterDataRequest req) {
        settingsService.saveMasterData(req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "초대 목록 조회")
    @GetMapping("/invitations")
    public ResponseEntity<List<InvitedUserResponse>> listInvitations() {
        return ResponseEntity.ok(settingsService.listInvitations());
    }

    @Operation(summary = "사용자 초대 발송")
    @PostMapping("/invitations")
    public ResponseEntity<UUID> inviteUser(@Valid @RequestBody InviteUserRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(settingsService.inviteUser(req));
    }

    @Operation(summary = "초대 재발송")
    @PostMapping("/invitations/{id}/resend")
    public ResponseEntity<Void> resendInvitation(@PathVariable UUID id) {
        settingsService.resendInvitation(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "사용자 정보 수정 (이름·전화번호·소속·역할)")
    @PutMapping("/invitations/{id}")
    public ResponseEntity<Void> updateInvitedUser(@PathVariable UUID id,
            @Valid @RequestBody kr.co.linker.admin.dto.UpdateInvitedUserRequest req) {
        settingsService.updateInvitedUser(id, req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "사용자 프로필 사진 업로드")
    @PostMapping(value = "/invitations/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<java.util.Map<String, String>> uploadUserPhoto(@PathVariable UUID id,
            @RequestPart("file") MultipartFile file) throws java.io.IOException {
        String url = settingsService.uploadUserPhoto(id, file.getBytes(), file.getContentType(), file.getOriginalFilename());
        return ResponseEntity.ok(java.util.Map.of("url", url));
    }

    @Operation(summary = "초대 취소")
    @DeleteMapping("/invitations/{id}")
    public ResponseEntity<Void> revokeInvitation(@PathVariable UUID id) {
        settingsService.revokeInvitation(id);
        return ResponseEntity.noContent().build();
    }

    // ── 추천소스 첨부파일 ────────────────────────────────────────────────────────

    @Operation(summary = "추천소스 첨부파일 업로드")
    @PostMapping(value = "/attachments/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AllSettingsResponse.Attachment> uploadAttachment(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name) {
        return ResponseEntity.ok(settingsService.uploadAttachment(file, name));
    }

    @Operation(summary = "첨부파일 다운로드 URL 발급")
    @GetMapping("/attachments/download-url")
    public ResponseEntity<java.util.Map<String, String>> getDownloadUrl(@RequestParam String key) {
        String url = settingsService.getAttachmentDownloadUrl(key);
        return ResponseEntity.ok(java.util.Map.of("url", url));
    }

    @Operation(summary = "첨부파일 삭제")
    @DeleteMapping("/attachments")
    public ResponseEntity<Void> deleteAttachment(@RequestParam String key) {
        settingsService.deleteAttachment(key);
        return ResponseEntity.noContent().build();
    }
}
