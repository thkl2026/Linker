package kr.co.linker.talent.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

/**
 * TalentCategory ↔ DB 문자열 컨버터.
 *
 * <p>DB에 더 이상 유효하지 않은(구) enum 값이 남아 있어도 읽기 시 예외 없이 null로 처리하여
 * 엔티티 하이드레이션 실패(500)를 방지한다. 필터링은 네이티브 쿼리(문자열 비교)로 수행하므로
 * 이 컨버터의 파라미터 바인딩에 의존하지 않는다.
 */
@Converter
@Slf4j
public class TalentCategoryConverter implements AttributeConverter<TalentCategory, String> {

    @Override
    public String convertToDatabaseColumn(TalentCategory attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public TalentCategory convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return null;
        try {
            return TalentCategory.valueOf(dbData);
        } catch (IllegalArgumentException e) {
            log.warn("[CATEGORY] Unknown category value '{}' — defaulting to null", dbData);
            return null;
        }
    }
}
