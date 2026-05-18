package kr.co.linker.workreport.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.UUID;

/**
 * 주간 업무 보고 등록 요청 DTO (F-4.3)
 *
 * @param contractId 계약 UUID
 * @param reportWeek 보고 주차 시작일 (월요일 기준)
 * @param content    업무 내용 (자유 형식)
 */
public record SubmitWorkReportRequest(
        @NotNull UUID contractId,
        @NotNull LocalDate reportWeek,
        @NotBlank String content
) {}
