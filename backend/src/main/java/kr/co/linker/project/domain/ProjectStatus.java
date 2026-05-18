package kr.co.linker.project.domain;

/**
 * 프로젝트 상태 Enum
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
public enum ProjectStatus {
    /** 인력 모집 중 */
    OPEN,
    /** 인력 확정 완료 */
    MATCHED,
    /** 프로젝트 종료 */
    CLOSED,
    /** 프로젝트 취소 */
    CANCELLED
}
