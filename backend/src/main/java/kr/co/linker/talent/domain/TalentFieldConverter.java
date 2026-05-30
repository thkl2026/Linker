package kr.co.linker.talent.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

/**
 * TalentField ↔ DB 문자열 컨버터.
 *
 * <p>DB에 더 이상 유효하지 않은(구) enum 값이 남아 있어도 읽기 시 예외 없이 ETC로 처리하여
 * 엔티티 하이드레이션 실패(500)를 방지한다.
 */
@Converter
@Slf4j
public class TalentFieldConverter implements AttributeConverter<TalentField, String> {

    @Override
    public String convertToDatabaseColumn(TalentField attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public TalentField convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return null;
        try {
            return TalentField.valueOf(dbData);
        } catch (IllegalArgumentException e) {
            log.warn("[FIELD] Unknown field value '{}' — defaulting to ETC", dbData);
            return TalentField.ETC;
        }
    }
}
