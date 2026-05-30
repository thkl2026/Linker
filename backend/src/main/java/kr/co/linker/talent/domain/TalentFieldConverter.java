package kr.co.linker.talent.domain;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;

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
