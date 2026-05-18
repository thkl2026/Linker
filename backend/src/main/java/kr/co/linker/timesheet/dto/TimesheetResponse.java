package kr.co.linker.timesheet.dto;

import kr.co.linker.timesheet.domain.Timesheet;
import kr.co.linker.timesheet.domain.TimesheetStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * 타임시트 응답 DTO
 */
public record TimesheetResponse(
        UUID id,
        UUID contractId,
        UUID talentId,
        LocalDate workDate,
        BigDecimal hoursWorked,
        String workDescription,
        TimesheetStatus status,
        boolean aiAnomalyFlag,
        UUID approvedBy,
        OffsetDateTime approvedAt,
        OffsetDateTime createdAt
) {
    public static TimesheetResponse from(Timesheet ts) {
        return new TimesheetResponse(
                ts.getId(), ts.getContractId(), ts.getTalentId(),
                ts.getWorkDate(), ts.getHoursWorked(), ts.getWorkDescription(),
                ts.getStatus(), ts.isAiAnomalyFlag(),
                ts.getApprovedBy(), ts.getApprovedAt(), ts.getCreatedAt()
        );
    }
}
