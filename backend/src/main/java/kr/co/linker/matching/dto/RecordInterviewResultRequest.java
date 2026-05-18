package kr.co.linker.matching.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * 인터뷰 결과 기록 요청 DTO
 *
 * @param result PASS 또는 FAIL
 * @param notes  메모
 */
public record RecordInterviewResultRequest(
        @NotBlank @Pattern(regexp = "PASS|FAIL") String result,
        String notes
) {}
