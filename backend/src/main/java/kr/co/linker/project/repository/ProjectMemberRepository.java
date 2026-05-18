package kr.co.linker.project.repository;

import kr.co.linker.project.domain.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {
    List<ProjectMember> findByProjectId(UUID projectId);
    boolean existsByProjectIdAndTalentId(UUID projectId, UUID talentId);
}
