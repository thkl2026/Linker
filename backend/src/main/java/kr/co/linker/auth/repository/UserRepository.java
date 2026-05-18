package kr.co.linker.auth.repository;

import kr.co.linker.auth.domain.User;
import kr.co.linker.auth.domain.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * 사용자 계정 Repository
 *
 * <p>이메일·연락처 조회는 반드시 해시 컬럼으로 수행한다. 암호화된 원문 컬럼으로 직접 조회 금지.
 *
 * @rule 그라운드룰 Rule 2: 이메일·연락처 검색은 해시 기반으로만 수행
 */
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * 이메일 해시로 사용자 조회 — 중복 가입 확인 및 로그인에 사용
     *
     * @param emailHash SHA-256 해시된 이메일
     * @return 해당 이메일의 사용자 (없으면 empty)
     */
    Optional<User> findByEmailHash(String emailHash);

    /**
     * 이메일 해시 존재 여부 확인 — 중복 가입 검사
     *
     * @param emailHash SHA-256 해시된 이메일
     * @return 존재하면 true
     */
    boolean existsByEmailHash(String emailHash);

    Page<User> findAllByRole(UserRole role, Pageable pageable);

    Page<User> findAllByRoleNot(UserRole role, Pageable pageable);

    long countByRole(UserRole role);

    java.util.List<User> findByRoleAndIsActiveTrue(UserRole role);
}
