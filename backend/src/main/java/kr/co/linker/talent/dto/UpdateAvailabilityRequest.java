package kr.co.linker.talent.dto;

import jakarta.validation.constraints.NotNull;
import kr.co.linker.talent.domain.AvailabilityStatus;

import java.time.LocalDate;

/**
 * 가용 상태 변경 요청 DTO (F-1.2)
 *
 * @param status        변경할 가용 상태
 * @param availableFrom BUSY 상태 시 가용 예정일 (선택)
 */
public record UpdateAvailabilityRequest(
        @NotNull AvailabilityStatus status,
        LocalDate availableFrom
) {}
