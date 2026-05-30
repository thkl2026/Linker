package kr.co.linker.admin.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import kr.co.linker.admin.domain.PlatformSetting;
import kr.co.linker.admin.domain.UserInvitation;
import kr.co.linker.admin.dto.AllSettingsResponse;
import kr.co.linker.admin.dto.InviteUserRequest;
import kr.co.linker.admin.dto.InvitedUserResponse;
import kr.co.linker.admin.dto.SaveEvaluationSettingsRequest;
import kr.co.linker.admin.dto.SaveGeneralSettingsRequest;
import kr.co.linker.admin.dto.SaveMasterDataRequest;
import kr.co.linker.admin.dto.SaveSmtpSettingsRequest;
import kr.co.linker.admin.dto.SaveNotificationSettingsRequest;
import kr.co.linker.admin.repository.PlatformSettingRepository;
import kr.co.linker.admin.repository.UserInvitationRepository;
import kr.co.linker.auth.repository.UserRepository;
import kr.co.linker.common.email.EmailService;
import kr.co.linker.common.encryption.EncryptionService;
import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.common.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SettingsService {

    private final PlatformSettingRepository settingRepo;
    private final UserInvitationRepository invitationRepo;
    private final UserRepository userRepository;
    private final EncryptionService encryptionService;
    private final ObjectMapper objectMapper;
    private final FileStorageService fileStorageService;
    private final EmailService emailService;

    @Value("${linker.app.base-url}")
    private String baseUrl;

    // ── 전체 설정 조회 ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AllSettingsResponse getAllSettings() {
        Map<String, String> map = settingRepo.findAll()
                .stream().collect(Collectors.toMap(PlatformSetting::getKey, PlatformSetting::getValue));

        AllSettingsResponse.GeneralSettings general = new AllSettingsResponse.GeneralSettings(
                map.getOrDefault("general.platformName", "Linker"),
                map.getOrDefault("general.contactPhone", ""),
                new BigDecimal(map.getOrDefault("general.feeRate", "10")),
                map.getOrDefault("general.logoUrl", null),
                map.getOrDefault("general.companyLogoUrl", null)
        );

        List<AllSettingsResponse.EvaluationMetric> metrics = parseJson(
                map.getOrDefault("evaluation.metrics", "[]"),
                new TypeReference<>() {}
        );
        AllSettingsResponse.EvaluationSettings evaluation = new AllSettingsResponse.EvaluationSettings(
                metrics,
                new BigDecimal(map.getOrDefault("evaluation.gradeS", "4.8")),
                new BigDecimal(map.getOrDefault("evaluation.gradeA", "4.5")),
                new BigDecimal(map.getOrDefault("evaluation.gradeB", "3.5"))
        );

        AllSettingsResponse.NotificationSettings notifications = new AllSettingsResponse.NotificationSettings(
                Integer.parseInt(map.getOrDefault("notification.evalReminderDays", "3")),
                Boolean.parseBoolean(map.getOrDefault("notification.evalReminderEnabled", "true")),
                Integer.parseInt(map.getOrDefault("notification.urgentHours", "48")),
                Boolean.parseBoolean(map.getOrDefault("notification.urgentEnabled", "true"))
        );

        List<AllSettingsResponse.Contractor> contractors = parseContractors(map.getOrDefault("master.contractors", "[]"));
        List<String> techStacks = parseJson(map.getOrDefault("master.techStacks", "[]"), new TypeReference<>() {});

        // 추천소스: 신규 키 우선, 없으면 구 문자열 배열에서 마이그레이션
        List<AllSettingsResponse.ReferralSource> referralSources;
        if (map.containsKey("master.referralSources")) {
            referralSources = parseJson(map.get("master.referralSources"), new TypeReference<>() {});
        } else {
            List<String> oldOrgs = parseJson(map.getOrDefault("master.referralOrgs", "[]"), new TypeReference<>() {});
            referralSources = oldOrgs.stream()
                    .map(name -> new AllSettingsResponse.ReferralSource(name, "", "", "", "", List.of(), List.of()))
                    .toList();
        }

        // 프로젝트 인력 역할: 설정값 없으면 기본값 반환
        List<String> projectRoles;
        if (map.containsKey("master.projectRoles")) {
            projectRoles = parseJson(map.get("master.projectRoles"), new TypeReference<>() {});
        } else {
            projectRoles = List.of(
                "프론트엔드 개발자", "백엔드 개발자", "풀스택 개발자",
                "PM/PL", "TA", "AA", "DA", "DBA",
                "UI/UX 디자이너", "UI/UX 기획자", "웹 디자이너",
                "QA 엔지니어", "DevOps 엔지니어", "데이터 엔지니어", "AI/ML 엔지니어",
                "IT 컨설턴트", "비즈니스 컨설턴트", "ERP 컨설턴트",
                "시스템 운영 엔지니어", "네트워크 엔지니어", "보안 엔지니어", "클라우드 엔지니어",
                "기타"
            );
        }

        AllSettingsResponse.SmtpSettings smtp = new AllSettingsResponse.SmtpSettings(
                map.getOrDefault("smtp.host", ""),
                Integer.parseInt(map.getOrDefault("smtp.port", "587")),
                map.getOrDefault("smtp.username", ""),
                map.containsKey("smtp.password") && !map.get("smtp.password").isBlank()
        );

        return new AllSettingsResponse(general, evaluation, notifications, new AllSettingsResponse.MasterData(contractors, techStacks, referralSources, projectRoles), smtp);
    }

    // ── 섹션별 저장 ───────────────────────────────────────────────────────────

    @Transactional
    public void saveGeneral(SaveGeneralSettingsRequest req) {
        put("general.platformName", req.platformName());
        put("general.contactPhone", req.contactPhone() != null ? req.contactPhone() : "");
        put("general.feeRate", req.feeRate().toPlainString());
        if (req.logoUrl() != null) put("general.logoUrl", req.logoUrl());
        if (req.companyLogoUrl() != null) put("general.companyLogoUrl", req.companyLogoUrl());
        log.info("[SETTINGS] 일반 설정 저장");
    }

    @Transactional
    public void saveEvaluation(SaveEvaluationSettingsRequest req) {
        putJson("evaluation.metrics", req.metrics() != null ? req.metrics() : List.of());
        if (req.gradeS() != null) put("evaluation.gradeS", req.gradeS().toPlainString());
        if (req.gradeA() != null) put("evaluation.gradeA", req.gradeA().toPlainString());
        if (req.gradeB() != null) put("evaluation.gradeB", req.gradeB().toPlainString());
        log.info("[SETTINGS] 평가 설정 저장");
    }

    @Transactional
    public void saveNotifications(SaveNotificationSettingsRequest req) {
        put("notification.evalReminderDays",    String.valueOf(req.evalReminderDays()));
        put("notification.evalReminderEnabled", String.valueOf(req.evalReminderEnabled()));
        put("notification.urgentHours",         String.valueOf(req.urgentHours()));
        put("notification.urgentEnabled",       String.valueOf(req.urgentEnabled()));
        log.info("[SETTINGS] 알림 설정 저장");
    }

    @Transactional
    public void saveSmtp(SaveSmtpSettingsRequest req) {
        if (req.host()     != null) put("smtp.host",     req.host());
        if (req.port()     != null) put("smtp.port",     String.valueOf(req.port()));
        if (req.username() != null) put("smtp.username", req.username());
        if (req.password() != null && !req.password().isBlank()) put("smtp.password", req.password());
        log.info("[SETTINGS] SMTP 설정 저장");
    }

    @Transactional
    public void saveMasterData(SaveMasterDataRequest req) {
        putJson("master.contractors",    req.contractors()      != null ? req.contractors()      : List.of());
        putJson("master.techStacks",     req.techStacks()       != null ? req.techStacks()       : List.of());
        putJson("master.referralSources", req.referralSources() != null ? req.referralSources() : List.of());
        putJson("master.projectRoles",   req.projectRoles()     != null ? req.projectRoles()     : List.of());
        log.info("[SETTINGS] 마스터 데이터 저장");
    }

    // ── 사용자 초대 ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<InvitedUserResponse> listInvitations() {
        return invitationRepo.findAllByOrderByInvitedAtDesc()
                .stream().map(inv -> {
                    if (!"ACCEPTED".equals(inv.getStatus())) {
                        return InvitedUserResponse.from(inv, baseUrl);
                    }
                    String emailHash = encryptionService.hash(inv.getEmail());
                    return userRepository.findByEmailHash(emailHash)
                            .map(user -> {
                                String name = resolveUserName(user, inv.getEmail());
                                String phone = decryptSafe(user.getPhone());
                                String lastLoginAt = user.getLastLoginAt() != null ? user.getLastLoginAt().toString() : null;
                                String accountCreatedAt = user.getCreatedAt() != null ? user.getCreatedAt().toString() : null;
                                String photoUrl = user.getPhotoKey() != null
                                        ? fileStorageService.generateDownloadUrl(user.getPhotoKey(), java.time.Duration.ofHours(1)) : null;
                                return InvitedUserResponse.from(inv, baseUrl, name, phone, lastLoginAt, user.getLastLoginIp(), accountCreatedAt, photoUrl);
                            })
                            .orElseGet(() -> InvitedUserResponse.from(inv, baseUrl));
                }).toList();
    }

    private String resolveUserName(kr.co.linker.auth.domain.User user, String plainEmail) {
        if (user.getName() != null) return user.getName();
        if (user.isIdentityVerified() && user.getRealName() != null) {
            String decrypted = decryptSafe(user.getRealName());
            if (decrypted != null) return decrypted;
        }
        int at = plainEmail.indexOf('@');
        return at > 0 ? plainEmail.substring(0, at) : plainEmail;
    }

    private String decryptSafe(String encrypted) {
        if (encrypted == null) return null;
        try { return encryptionService.decrypt(encrypted); } catch (Exception e) { return null; }
    }

    @Transactional
    public UUID inviteUser(InviteUserRequest req) {
        UserInvitation inv = invitationRepo.findByEmail(req.email())
                .map(existing -> { existing.resend(); return existing; })
                .orElseGet(() -> UserInvitation.create(req.email(), req.company(), req.role()));
        invitationRepo.save(inv);
        try {
            emailService.sendInvitation(inv.getEmail(), inv.getRole(), baseUrl + "/invite/" + inv.getToken());
        } catch (Exception e) {
            log.error("[SETTINGS] 초대 메일 발송 실패 email={} token={}", req.email(), inv.getToken(), e);
        }
        log.info("[SETTINGS] 사용자 초대 email={} role={}", req.email(), req.role());
        return inv.getId();
    }

    @Transactional
    public void resendInvitation(UUID id) {
        UserInvitation inv = requireInvitation(id);
        inv.resend();
        try {
            emailService.sendInvitation(inv.getEmail(), inv.getRole(), baseUrl + "/invite/" + inv.getToken());
        } catch (Exception e) {
            log.error("[SETTINGS] 초대 메일 재발송 실패 id={} email={} token={}", id, inv.getEmail(), inv.getToken(), e);
        }
        log.info("[SETTINGS] 초대 재발송 id={}", id);
    }

    @Transactional
    public void revokeInvitation(UUID id) {
        requireInvitation(id);
        invitationRepo.deleteById(id);
        log.info("[SETTINGS] 초대 취소 id={}", id);
    }

    @Transactional
    public void updateInvitedUser(UUID id, kr.co.linker.admin.dto.UpdateInvitedUserRequest req) {
        UserInvitation inv = requireInvitation(id);
        inv.updateInfo(req.company(), req.role());

        // 가입 완료된 사용자면 실제 User 레코드도 갱신
        if ("ACCEPTED".equals(inv.getStatus())) {
            String emailHash = encryptionService.hash(inv.getEmail());
            userRepository.findByEmailHash(emailHash).ifPresent(user -> {
                user.updateProfile(req.name(), null, req.company());
                if (req.phone() != null) {
                    String trimmed = req.phone().trim();
                    if (trimmed.isBlank()) {
                        user.updatePhone(null, null);
                    } else {
                        user.updatePhone(encryptionService.encrypt(trimmed), encryptionService.hash(trimmed));
                    }
                }
                if (req.role() != null && !req.role().isBlank()) {
                    try {
                        user.changeRole(kr.co.linker.auth.domain.UserRole.valueOf(req.role().trim()));
                    } catch (IllegalArgumentException ignored) {
                        log.warn("[SETTINGS] 알 수 없는 역할 값 무시 role={}", req.role());
                    }
                }
            });
        }
        log.info("[SETTINGS] 사용자 정보 수정 id={} role={}", id, req.role());
    }

    @Transactional
    public String uploadUserPhoto(UUID id, byte[] data, String contentType, String originalFilename) {
        UserInvitation inv = requireInvitation(id);
        if (!"ACCEPTED".equals(inv.getStatus())) {
            throw new kr.co.linker.common.exception.LinkerException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "NOT_ACCEPTED", "가입 완료된 사용자만 사진을 등록할 수 있습니다.");
        }
        String ext = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.')) : "";
        String key = "user-photos/" + id + "/" + UUID.randomUUID() + ext;
        fileStorageService.uploadBytes(key, data, contentType != null ? contentType : "image/jpeg");

        String emailHash = encryptionService.hash(inv.getEmail());
        userRepository.findByEmailHash(emailHash).ifPresent(user -> user.updatePhotoKey(key));
        log.info("[SETTINGS] 사용자 사진 업로드 id={} key={}", id, key);
        return fileStorageService.generateDownloadUrl(key, java.time.Duration.ofHours(1));
    }

    // ── 내부 유틸 ─────────────────────────────────────────────────────────────

    private void put(String key, String value) {
        PlatformSetting setting = settingRepo.findById(key)
                .orElseGet(() -> PlatformSetting.of(key, value));
        setting.setValue(value);
        settingRepo.save(setting);
    }

    private void putJson(String key, Object value) {
        try { put(key, objectMapper.writeValueAsString(value)); }
        catch (Exception e) {
            throw new LinkerException(HttpStatus.INTERNAL_SERVER_ERROR, "SETTINGS_SERIALIZE_ERROR", "설정 직렬화 오류");
        }
    }

    private <T> T parseJson(String json, TypeReference<T> type) {
        try { return objectMapper.readValue(json, type); }
        catch (Exception e) {
            throw new LinkerException(HttpStatus.INTERNAL_SERVER_ERROR, "SETTINGS_PARSE_ERROR", "설정 파싱 오류");
        }
    }

    // 구(문자열 배열) 포맷에서 신(객체 배열) 포맷으로 마이그레이션
    private List<AllSettingsResponse.Contractor> parseContractors(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<AllSettingsResponse.Contractor>>() {});
        } catch (Exception e) {
            try {
                List<String> oldNames = objectMapper.readValue(json, new TypeReference<List<String>>() {});
                return oldNames.stream()
                        .map(name -> new AllSettingsResponse.Contractor(name, "", "", "", List.of(), List.of()))
                        .toList();
            } catch (Exception e2) {
                return List.of();
            }
        }
    }

    private UserInvitation requireInvitation(UUID id) {
        return invitationRepo.findById(id)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "INVITATION_NOT_FOUND", "초대를 찾을 수 없습니다."));
    }

    // ── 추천소스 첨부파일 ─────────────────────────────────────────────────────

    public AllSettingsResponse.Attachment uploadAttachment(MultipartFile file, String displayName) {
        String ext = StringUtils.getFilenameExtension(
                Objects.requireNonNullElse(file.getOriginalFilename(), "file"));
        String key = "referral-attachments/" + UUID.randomUUID() + (ext != null ? "." + ext : "");
        try {
            fileStorageService.uploadBytes(key, file.getBytes(),
                    Objects.requireNonNullElse(file.getContentType(), "application/octet-stream"));
        } catch (IOException e) {
            throw new LinkerException(HttpStatus.INTERNAL_SERVER_ERROR, "FILE_UPLOAD_FAILED", "파일 업로드 실패");
        }
        log.info("[REFERRAL_ATTACHMENT_UPLOAD] key={} name={}", key, displayName);
        return new AllSettingsResponse.Attachment(displayName, key);
    }

    public String getAttachmentDownloadUrl(String key) {
        return fileStorageService.generateDownloadUrl(key, Duration.ofMinutes(10));
    }

    public void deleteAttachment(String key) {
        if (!key.startsWith("referral-attachments/")) {
            throw new LinkerException(HttpStatus.BAD_REQUEST, "INVALID_KEY", "잘못된 파일 경로입니다.");
        }
        fileStorageService.delete(key);
        log.info("[REFERRAL_ATTACHMENT_DELETE] key={}", key);
    }
}
