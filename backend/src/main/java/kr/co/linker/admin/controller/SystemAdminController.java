package kr.co.linker.admin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import kr.co.linker.admin.dto.CreateUserRequest;
import kr.co.linker.admin.dto.UpdateUserRequest;
import kr.co.linker.admin.dto.UserSummaryResponse;
import kr.co.linker.admin.service.SystemAdminService;
import kr.co.linker.auth.domain.UserRole;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@Tag(name = "SystemAdmin", description = "시스템 관리자 전용 API — 계정·설정·통계")
@RestController
@RequestMapping("/api/v1/system-admin")
@PreAuthorize("hasRole('SYSTEM_ADMIN')")
@RequiredArgsConstructor
public class SystemAdminController {

    private final SystemAdminService systemAdminService;

    @Operation(summary = "대시보드 통계")
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getDashboardStats() {
        return ResponseEntity.ok(systemAdminService.getDashboardStats());
    }

    @Operation(summary = "사용자 목록 조회")
    @GetMapping("/users")
    public ResponseEntity<Page<UserSummaryResponse>> listUsers(
            @RequestParam(required = false) UserRole role,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(systemAdminService.listUsers(role, pageable));
    }

    @Operation(summary = "사용자 생성 (SYSTEM_ADMIN/SERVICE_ADMIN/PM/PROCUREMENT)")
    @PostMapping("/users")
    public ResponseEntity<UUID> createUser(@Valid @RequestBody CreateUserRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(systemAdminService.createUser(req));
    }

    @Operation(summary = "사용자 정보 수정 (이름·직책·소속·역할)")
    @PutMapping("/users/{id}")
    public ResponseEntity<Void> updateUser(@PathVariable UUID id,
                                           @Valid @RequestBody UpdateUserRequest req) {
        systemAdminService.updateUser(id, req);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "사용자 비활성화")
    @PutMapping("/users/{id}/deactivate")
    public ResponseEntity<Void> deactivateUser(@PathVariable UUID id) {
        systemAdminService.deactivateUser(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "사용자 활성화")
    @PutMapping("/users/{id}/activate")
    public ResponseEntity<Void> activateUser(@PathVariable UUID id) {
        systemAdminService.activateUser(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "비밀번호 초기화")
    @PutMapping("/users/{id}/reset-password")
    public ResponseEntity<Void> resetPassword(@PathVariable UUID id,
                                               @RequestBody Map<String, String> body) {
        systemAdminService.resetPassword(id, body.get("password"));
        return ResponseEntity.noContent().build();
    }
}
