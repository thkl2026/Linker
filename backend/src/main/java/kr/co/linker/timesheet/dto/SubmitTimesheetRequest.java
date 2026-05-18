package kr.co.linker.timesheet.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * 타임시트 등록 요청 DTO
 *
 * @param contractId      계약 UUID
 * @param workDate        근무 날짜
 * @param hoursWorked     근무 시간 (0.5h 단위, 최대 24h)
 * @param workDescription 업무 내용
 */
public record SubmitTimesheetRequest(
        @NotNull UUID contractId,
        @NotNull @PastOrPresent LocalDate workDate,
        @NotNull @DecimalMin("0.5") @DecimalMax("24.0") BigDecimal hoursWorked,
        String workDescription
) {}
