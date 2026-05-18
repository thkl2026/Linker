package kr.co.linker.common.config;

import kr.co.linker.auth.domain.User;
import kr.co.linker.auth.domain.UserRole;
import kr.co.linker.auth.repository.UserRepository;
import kr.co.linker.common.encryption.EncryptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final UserRepository    userRepository;
    private final PasswordEncoder   passwordEncoder;
    private final EncryptionService encryptionService;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        createIfAbsent("sysadmin@linker.com",  "Linker1234!", UserRole.SYSTEM_ADMIN);
        createIfAbsent("svcadmin@linker.com",  "Linker1234!", UserRole.SERVICE_ADMIN);
        createIfAbsent("pm@linker.com",        "Linker1234!", UserRole.PM);
        createIfAbsent("proc@linker.com",      "Linker1234!", UserRole.PROCUREMENT);
    }

    private void createIfAbsent(String email, String password, UserRole role) {
        String emailHash = encryptionService.hash(email);
        if (userRepository.existsByEmailHash(emailHash)) {
            return;
        }
        User user = User.create(
                encryptionService.encrypt(email),
                emailHash,
                passwordEncoder.encode(password),
                role
        );
        user.activate();
        userRepository.save(user);
        log.warn("[TEST ACCOUNT] role={} email={} password={}", role, email, password);
    }
}
