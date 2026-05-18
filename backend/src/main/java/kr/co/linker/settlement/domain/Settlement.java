package kr.co.linker.settlement.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 정산 엔티티 — 계약별 월 단위 정산 마스터 (F-4.1)
 *
 * <p>승인된 타임시트를 집계하여 생성한다.
 * DRAFT → APPROVED → PAID 상태 전이.
 */
@Entity
@Table(name = "settlements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Settlement {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "contract_id", nullable = false, columnDefinition = "uuid")
    private UUID contractId;

    @Column(name = "talent_id", nullable = false, columnDefinition = "uuid")
    private UUID talentId;

    @Column(name = "settlement_month", nullable = false)
    private LocalDate settlementMonth;

    @Column(name = "total_hours", nullable = false, precision = 8, scale = 2)
    private BigDecimal totalHours;

    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "gross_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "deduction", precision = 15, scale = 2)
    private BigDecimal deduction;

    @Column(name = "net_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal netAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementStatus status;

    @Column(name = "approved_by", columnDefinition = "uuid")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static Settlement create(UUID contractId, UUID talentId,
                                    LocalDate settlementMonth, BigDecimal totalHours,
                                    BigDecimal unitPrice, BigDecimal deduction) {
        Settlement s = new Settlement();
        s.id = UUID.randomUUID();
        s.contractId = contractId;
        s.talentId = talentId;
        s.settlementMonth = settlementMonth;
        s.totalHours = totalHours;
        s.unitPrice = unitPrice;
        s.grossAmount = totalHours.multiply(unitPrice);
        s.deduction = deduction != null ? deduction : BigDecimal.ZERO;
        s.netAmount = s.grossAmount.subtract(s.deduction);
        s.status = SettlementStatus.DRAFT;
        return s;
    }

    public void approve(UUID approverId) {
        if (this.status != SettlementStatus.DRAFT) {
            throw new IllegalStateException("승인 가능한 상태가 아닙니다: " + this.status);
        }
        this.status = SettlementStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvedAt = OffsetDateTime.now();
    }

    public void markPaid() {
        if (this.status != SettlementStatus.APPROVED) {
            throw new IllegalStateException("지급 처리 가능한 상태가 아닙니다: " + this.status);
        }
        this.status = SettlementStatus.PAID;
        this.paidAt = OffsetDateTime.now();
    }
}
