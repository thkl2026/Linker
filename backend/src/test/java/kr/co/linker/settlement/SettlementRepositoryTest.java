package kr.co.linker.settlement;

import kr.co.linker.common.AbstractIntegrationTest;
import kr.co.linker.settlement.domain.Settlement;
import kr.co.linker.settlement.domain.SettlementStatus;
import kr.co.linker.settlement.repository.SettlementRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.jdbc.Sql;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SettlementRepository Testcontainers 통합 테스트.
 *
 * <p>실제 PostgreSQL 컨테이너에서 쿼리·제약 조건을 검증한다.
 */
@Sql("/db/settlement-test-data.sql")
class SettlementRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    SettlementRepository settlementRepository;

    @Test
    @DisplayName("계약ID + 정산월로 정산을 정확히 조회한다")
    void findByContractIdAndSettlementMonth_returnsMatch() {
        UUID contractId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
        LocalDate month = LocalDate.of(2026, 3, 1);

        Optional<Settlement> result =
                settlementRepository.findByContractIdAndSettlementMonth(contractId, month);

        assertThat(result).isPresent();
        assertThat(result.get().getStatus()).isEqualTo(SettlementStatus.DRAFT);
        assertThat(result.get().getTotalHours()).isEqualByComparingTo(new BigDecimal("80.00"));
    }

    @Test
    @DisplayName("계약ID로 정산 목록을 정산월 내림차순으로 반환한다")
    void findByContractIdOrderBySettlementMonthDesc_returnsSortedList() {
        UUID contractId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");

        List<Settlement> list =
                settlementRepository.findByContractIdOrderBySettlementMonthDesc(contractId);

        assertThat(list).hasSize(2);
        assertThat(list.get(0).getSettlementMonth())
                .isAfterOrEqualTo(list.get(1).getSettlementMonth());
    }

    @Test
    @DisplayName("DRAFT 상태 정산을 approve() 하면 APPROVED로 전이된다")
    void approve_changesStatusToApproved() {
        UUID contractId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
        LocalDate month = LocalDate.of(2026, 3, 1);
        UUID approverId = UUID.fromString("cccccccc-0000-0000-0000-000000000001");

        Settlement settlement =
                settlementRepository.findByContractIdAndSettlementMonth(contractId, month).orElseThrow();
        settlement.approve(approverId);
        settlementRepository.flush();

        Settlement refreshed = settlementRepository.findById(settlement.getId()).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(SettlementStatus.APPROVED);
        assertThat(refreshed.getApprovedBy()).isEqualTo(approverId);
    }

    @Test
    @DisplayName("중복 정산월 저장 시 UNIQUE 제약 위반이 발생한다")
    void uniqueConstraint_preventsDoubleSettlement() {
        UUID contractId = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
        UUID talentId = UUID.fromString("bbbbbbbb-0000-0000-0000-000000000001");
        LocalDate month = LocalDate.of(2026, 3, 1);

        Settlement duplicate = Settlement.create(contractId, talentId, month,
                new BigDecimal("40.00"), new BigDecimal("500000"), BigDecimal.ZERO);

        org.junit.jupiter.api.Assertions.assertThrows(
                Exception.class,
                () -> {
                    settlementRepository.saveAndFlush(duplicate);
                }
        );
    }
}
