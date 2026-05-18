package kr.co.linker.contract.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * 계약 엔티티 (F-3.1)
 */
@Entity
@Table(name = "contracts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Contract {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "project_id", columnDefinition = "uuid")
    private UUID projectId;

    @Column(name = "talent_id", columnDefinition = "uuid")
    private UUID talentId;

    @Column(name = "procurement_id", columnDefinition = "uuid")
    private UUID procurementId;

    @Column(name = "unit_price", precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_amount", precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "contract_terms", columnDefinition = "TEXT")
    private String contractTerms;

    @Column(name = "contract_file_url")
    private String contractFileUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ai_price_analysis", columnDefinition = "jsonb")
    private Map<String, Object> aiPriceAnalysis;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContractStatus status;

    @Column(name = "signed_at")
    private OffsetDateTime signedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static Contract create(UUID projectId, UUID talentId, UUID procurementId,
                                  BigDecimal unitPrice, BigDecimal totalAmount,
                                  String contractTerms) {
        Contract c = new Contract();
        c.id = UUID.randomUUID();
        c.projectId = projectId;
        c.talentId = talentId;
        c.procurementId = procurementId;
        c.unitPrice = unitPrice;
        c.totalAmount = totalAmount;
        c.contractTerms = contractTerms;
        c.status = ContractStatus.DRAFT;
        return c;
    }

    public void sign() {
        if (this.status != ContractStatus.DRAFT) {
            throw new IllegalStateException("서명 가능한 상태가 아닙니다: " + this.status);
        }
        this.status = ContractStatus.SIGNED;
        this.signedAt = OffsetDateTime.now();
    }

    public void terminate() {
        this.status = ContractStatus.TERMINATED;
    }

    public void attachFile(String fileUrl) {
        this.contractFileUrl = fileUrl;
    }

    public void attachAiAnalysis(Map<String, Object> analysis) {
        this.aiPriceAnalysis = analysis;
    }
}
