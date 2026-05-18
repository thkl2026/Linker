package kr.co.linker.talent.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kr.co.linker.talent.domain.TalentCategory;
import kr.co.linker.talent.domain.TalentField;
import kr.co.linker.talent.domain.WorkType;

import java.math.BigDecimal;

/**
 * 인력 프로필 최초 생성 요청 DTO (온보딩)
 *
 * @param name        표시 이름 (필수)
 * @param category    직군 대분류 (선택)
 * @param field       직군 소분류 (선택)
 * @param workType    희망 근무 형태 (필수)
 * @param desiredRate 희망 단가 — 원(₩) 기준 (선택)
 * @param phone       연락처 — 평문, 서비스 레이어에서 암호화 (선택)
 */
public record CreateProfileRequest(
        @NotBlank @Size(max = 100)
        String name,

        TalentCategory category,

        TalentField field,

        @NotNull
        WorkType workType,

        @DecimalMin(value = "0", inclusive = false)
        BigDecimal desiredRate,

        @Size(max = 20)
        String phone
) {}
