package kr.co.linker.talent.domain;

/**
 * 인력 가용 상태 Enum
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
public enum AvailabilityStatus {
    /** 즉시 투입 가능 */
    AVAILABLE,
    /** 현재 프로젝트 수행 중 */
    BUSY,
    /** 휴식 중 (투입 불가) */
    REST
}
