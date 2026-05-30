package kr.co.linker.talent.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

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
