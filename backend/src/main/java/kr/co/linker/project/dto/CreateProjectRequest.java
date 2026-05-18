package kr.co.linker.project.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import kr.co.linker.talent.domain.WorkType;

import java.math.BigDecimal;

/**
 * 프로젝트 기회 등록 요청 DTO (F-2.1)
 *
 * @param title          제목 (최대 255자)
 * @param description    상세 설명
 * @param requiredSkills 요구 기술 JSON 문자열 ([{"skill":"Java","level":"senior"}])
 * @param budgetMin      예산 하한 (선택)
 * @param budgetMax      예산 상한 (선택)
 * @param workType       근무 형태
 */
public record CreateProjectRequest(
        @NotBlank @Size(max = 255) String title,
        String description,
        String requiredSkills,
        BigDecimal budgetMin,
        BigDecimal budgetMax,
        WorkType workType
) {}
