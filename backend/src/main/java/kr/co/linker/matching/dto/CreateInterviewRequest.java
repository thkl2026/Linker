package kr.co.linker.matching.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

/**
 * 인터뷰 일정 등록 요청 DTO
 *
 * @param scheduledAt 인터뷰 일정 (미래 시각)
 * @param location    장소 또는 화상회의 URL
 */
public record CreateInterviewRequest(
        @NotNull @Future OffsetDateTime scheduledAt,
        String location
) {}
