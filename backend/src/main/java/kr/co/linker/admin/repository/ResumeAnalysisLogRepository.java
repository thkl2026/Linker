package kr.co.linker.admin.repository;

import kr.co.linker.admin.domain.ResumeAnalysisLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ResumeAnalysisLogRepository extends JpaRepository<ResumeAnalysisLog, UUID> {
    Optional<ResumeAnalysisLog> findFirstByFileHashOrderByCreatedAtDesc(String fileHash);
}
