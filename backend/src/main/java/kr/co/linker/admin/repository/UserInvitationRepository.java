package kr.co.linker.admin.repository;

import kr.co.linker.admin.domain.UserInvitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserInvitationRepository extends JpaRepository<UserInvitation, UUID> {
    List<UserInvitation> findAllByOrderByInvitedAtDesc();
    Optional<UserInvitation> findByEmail(String email);
}
