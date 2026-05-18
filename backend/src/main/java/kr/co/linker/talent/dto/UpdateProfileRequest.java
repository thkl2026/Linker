package kr.co.linker.talent.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import kr.co.linker.talent.domain.TalentCategory;
import kr.co.linker.talent.domain.TalentField;
import kr.co.linker.talent.domain.WorkType;

import java.math.BigDecimal;

/**
 * 인력 프로필 수정 요청 DTO
 *
 * @param name        표시 이름 (1~100자)
 * @param category    직군 대분류
 * @param field       직군 소분류
 * @param desiredRate 희망 단가 (0 이상, null 허용)
 * @param workType    희망 근무 형태
 */
public record UpdateProfileRequest(
        @NotBlank @Size(max = 100)
        String name,

        TalentCategory category,

        TalentField field,

        @DecimalMin(value = "0", inclusive = false)
        BigDecimal desiredRate,

        WorkType workType,
        String title
) {}
