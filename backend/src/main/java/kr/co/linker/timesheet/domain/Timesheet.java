package kr.co.linker.timesheet.domain;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 타임시트 엔티티 — 인력의 일별 근무 기록 (F-3.3)
 */
@Entity
@Table(name = "timesheets")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Timesheet {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "contract_id", columnDefinition = "uuid")
    private UUID contractId;

    @Column(name = "talent_id", columnDefinition = "uuid")
    private UUID talentId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "hours_worked", nullable = false, precision = 4, scale = 2)
    private BigDecimal hoursWorked;

    @Column(name = "work_description", columnDefinition = "TEXT")
    private String workDescription;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TimesheetStatus status;

    @Column(name = "ai_anomaly_flag")
    private boolean aiAnomalyFlag;

    @Column(name = "approved_by", columnDefinition = "uuid")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static Timesheet create(UUID contractId, UUID talentId,
                                   LocalDate workDate, BigDecimal hoursWorked,
                                   String workDescription) {
        Timesheet ts = new Timesheet();
        ts.id = UUID.randomUUID();
        ts.contractId = contractId;
        ts.talentId = talentId;
        ts.workDate = workDate;
        ts.hoursWorked = hoursWorked;
        ts.workDescription = workDescription;
        ts.status = TimesheetStatus.SUBMITTED;
        ts.aiAnomalyFlag = false;
        return ts;
    }

    public void approve(UUID approverId) {
        this.status = TimesheetStatus.APPROVED;
        this.approvedBy = approverId;
        this.approvedAt = OffsetDateTime.now();
    }

    public void reject() {
        this.status = TimesheetStatus.REJECTED;
    }

    public void flagAnomaly() {
        this.aiAnomalyFlag = true;
    }
}
