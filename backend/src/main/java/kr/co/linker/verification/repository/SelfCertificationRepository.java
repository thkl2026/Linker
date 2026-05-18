package kr.co.linker.verification.repository;

import kr.co.linker.verification.domain.SelfCertification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** 자가 증명 Repository. */
public interface SelfCertificationRepository extends JpaRepository<SelfCertification, UUID> {

    List<SelfCertification> findByTalentIdOrderByAnalyzedAtDesc(UUID talentId);

    Optional<SelfCertification> findByTalentIdAndSourceUrl(UUID talentId, String sourceUrl);
}
