package kr.co.linker.talent.domain;

import com.fasterxml.jackson.annotation.JsonCreator;

/** 전문가 직군 대분류 */
public enum TalentCategory {
    DEVELOPER,   // 개발자
    ARCHITECT,   // 아키텍트
    DATA,        // 데이터
    SECURITY,    // 보안
    PM,          // 사업관리
    DESIGNER;    // UI/UX

    @JsonCreator
    public static TalentCategory fromJson(String value) {
        if (value == null || value.isBlank()) return null;
        try { return TalentCategory.valueOf(value); }
        catch (IllegalArgumentException e) { return null; }
    }
}
