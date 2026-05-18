package kr.co.linker.settlement;

import kr.co.linker.settlement.domain.Settlement;
import kr.co.linker.settlement.domain.SettlementStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Settlement 도메인 단위 테스트 — 상태 전이 로직 검증.
 */
class SettlementDomainTest {

    private static final UUID CONTRACT_ID = UUID.randomUUID();
    private static final UUID TALENT_ID = UUID.randomUUID();
    private static final LocalDate MONTH = LocalDate.of(2026, 4, 1);

    @Test
    @DisplayName("create() — grossAmount = totalHours × unitPrice, netAmount = gross - deduction")
    void create_calculatesAmountsCorrectly() {
        BigDecimal hours = new BigDecimal("80");
        BigDecimal unitPrice = new BigDecimal("500000");
        BigDecimal deduction = new BigDecimal("100000");

        Settlement s = Settlement.create(CONTRACT_ID, TALENT_ID, MONTH, hours, unitPrice, deduction);

        assertThat(s.getStatus()).isEqualTo(SettlementStatus.DRAFT);
        assertThat(s.getGrossAmount()).isEqualByComparingTo(new BigDecimal("40000000"));
        assertThat(s.getNetAmount()).isEqualByComparingTo(new BigDecimal("39900000"));
    }

    @Test
    @DisplayName("create() — deduction null이면 netAmount = grossAmount")
    void create_nullDeduction_netEqualGross() {
        Settlement s = Settlement.create(CONTRACT_ID, TALENT_ID, MONTH,
                new BigDecimal("40"), new BigDecimal("500000"), null);

        assertThat(s.getDeduction()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(s.getNetAmount()).isEqualByComparingTo(s.getGrossAmount());
    }

    @Test
    @DisplayName("approve() — DRAFT → APPROVED, approvedBy 저장")
    void approve_transitionsToDraft() {
        Settlement s = Settlement.create(CONTRACT_ID, TALENT_ID, MONTH,
                new BigDecimal("80"), new BigDecimal("500000"), BigDecimal.ZERO);
        UUID approverId = UUID.randomUUID();

        s.approve(approverId);

        assertThat(s.getStatus()).isEqualTo(SettlementStatus.APPROVED);
        assertThat(s.getApprovedBy()).isEqualTo(approverId);
        assertThat(s.getApprovedAt()).isNotNull();
    }

    @Test
    @DisplayName("approve() — APPROVED 상태에서 재승인 시 예외 발생")
    void approve_alreadyApproved_throws() {
        Settlement s = Settlement.create(CONTRACT_ID, TALENT_ID, MONTH,
                new BigDecimal("80"), new BigDecimal("500000"), BigDecimal.ZERO);
        s.approve(UUID.randomUUID());

        assertThatThrownBy(() -> s.approve(UUID.randomUUID()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APPROVED");
    }

    @Test
    @DisplayName("markPaid() — APPROVED → PAID")
    void markPaid_transitionsToPaid() {
        Settlement s = Settlement.create(CONTRACT_ID, TALENT_ID, MONTH,
                new BigDecimal("80"), new BigDecimal("500000"), BigDecimal.ZERO);
        s.approve(UUID.randomUUID());

        s.markPaid();

        assertThat(s.getStatus()).isEqualTo(SettlementStatus.PAID);
        assertThat(s.getPaidAt()).isNotNull();
    }

    @Test
    @DisplayName("markPaid() — DRAFT 상태에서 지급 처리 시 예외 발생")
    void markPaid_fromDraft_throws() {
        Settlement s = Settlement.create(CONTRACT_ID, TALENT_ID, MONTH,
                new BigDecimal("80"), new BigDecimal("500000"), BigDecimal.ZERO);

        assertThatThrownBy(s::markPaid)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DRAFT");
    }
}
