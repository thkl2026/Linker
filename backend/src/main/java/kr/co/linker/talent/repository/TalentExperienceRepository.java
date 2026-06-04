package kr.co.linker.talent.repository;

import kr.co.linker.talent.domain.TalentExperience;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TalentExperienceRepository extends JpaRepository<TalentExperience, UUID> {

    List<TalentExperience> findByTalentProfileIdOrderByStartDateDesc(UUID talentId);

    Optional<TalentExperience> findByIdAndTalentProfileId(UUID id, UUID talentId);

    void deleteByTalentProfileId(UUID talentId);

    void deleteByTalentProfileIdAndExperienceType(UUID talentId, String experienceType);
}
