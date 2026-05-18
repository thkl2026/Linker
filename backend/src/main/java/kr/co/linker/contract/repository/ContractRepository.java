package kr.co.linker.contract.repository;

import kr.co.linker.contract.domain.Contract;
import kr.co.linker.contract.domain.ContractStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ContractRepository extends JpaRepository<Contract, UUID> {

    List<Contract> findByTalentIdOrderByCreatedAtDesc(UUID talentId);

    List<Contract> findByProjectIdOrderByCreatedAtDesc(UUID projectId);

    List<Contract> findByStatusOrderByCreatedAtDesc(ContractStatus status);
}
