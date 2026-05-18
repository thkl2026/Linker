package kr.co.linker.admin.service;

import kr.co.linker.admin.dto.CreateUserRequest;
import kr.co.linker.admin.dto.UserSummaryResponse;
import kr.co.linker.auth.domain.User;
import kr.co.linker.auth.domain.UserRole;
import kr.co.linker.auth.repository.UserRepository;
import kr.co.linker.common.encryption.EncryptionService;
import kr.co.linker.common.exception.LinkerException;
import kr.co.linker.talent.repository.TalentProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SystemAdminService {

    private final UserRepository userRepository;
    private final TalentProfileRepository talentProfileRepository;
    private final EncryptionService encryptionService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public Page<UserSummaryResponse> listUsers(UserRole role, Pageable pageable) {
        Page<User> users = (role == null)
                ? userRepository.findAllByRoleNot(UserRole.TALENT, pageable)
                : userRepository.findAllByRole(role, pageable);
        return users.map(u -> UserSummaryResponse.from(u, decrypt(u.getEmail())));
    }

    @Transactional
    public UUID createUser(CreateUserRequest req) {
        String emailHash = encryptionService.hash(req.email());
        if (userRepository.existsByEmailHash(emailHash)) {
            throw new LinkerException(HttpStatus.CONFLICT, "EMAIL_DUPLICATE", "이미 사용 중인 이메일입니다.");
        }
        User user = User.create(
                encryptionService.encrypt(req.email()),
                emailHash,
                passwordEncoder.encode(req.password()),
                req.role()
        );
        userRepository.save(user);
        log.info("[SYSTEM_ADMIN] 사용자 생성 userId={} role={}", user.getId(), req.role());
        return user.getId();
    }

    @Transactional
    public void deactivateUser(UUID userId) {
        findUser(userId).deactivate();
        log.info("[SYSTEM_ADMIN] 사용자 비활성화 userId={}", userId);
    }

    @Transactional
    public void activateUser(UUID userId) {
        findUser(userId).activate();
        log.info("[SYSTEM_ADMIN] 사용자 활성화 userId={}", userId);
    }

    @Transactional
    public void resetPassword(UUID userId, String newPassword) {
        findUser(userId).resetPassword(passwordEncoder.encode(newPassword));
        log.info("[SYSTEM_ADMIN] 비밀번호 초기화 userId={}", userId);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getDashboardStats() {
        return Map.of(
                "systemAdmins",   userRepository.countByRole(UserRole.SYSTEM_ADMIN),
                "serviceAdmins",  userRepository.countByRole(UserRole.SERVICE_ADMIN),
                "pm",             userRepository.countByRole(UserRole.PM),
                "procurement",    userRepository.countByRole(UserRole.PROCUREMENT),
                "talents",        talentProfileRepository.countByDeletedAtIsNull()
        );
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new LinkerException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));
    }

    private String decrypt(String encrypted) {
        try { return encryptionService.decrypt(encrypted); }
        catch (Exception e) { return "***"; }
    }
}
