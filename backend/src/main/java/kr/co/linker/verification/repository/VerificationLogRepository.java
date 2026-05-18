package kr.co.linker.verification.repository;

import kr.co.linker.verification.domain.VerificationLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

/** 검증 로그 Repository. */
public interface VerificationLogRepository extends JpaRepository<VerificationLog, UUID> {

    List<VerificationLog> findByExperienceIdOrderByVerifiedAtDesc(UUID experienceId);
}
