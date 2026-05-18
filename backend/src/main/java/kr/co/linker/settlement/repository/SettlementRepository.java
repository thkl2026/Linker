package kr.co.linker.settlement.repository;

import kr.co.linker.settlement.domain.Settlement;
import kr.co.linker.settlement.domain.SettlementStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SettlementRepository extends JpaRepository<Settlement, UUID> {

    Optional<Settlement> findByContractIdAndSettlementMonth(UUID contractId, LocalDate settlementMonth);

    List<Settlement> findByContractIdOrderBySettlementMonthDesc(UUID contractId);

    List<Settlement> findByTalentIdOrderBySettlementMonthDesc(UUID talentId);

    List<Settlement> findByStatusOrderBySettlementMonthDesc(SettlementStatus status);
}
