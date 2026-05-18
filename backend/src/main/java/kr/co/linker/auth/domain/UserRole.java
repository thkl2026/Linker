package kr.co.linker.auth.domain;

/**
 * 사용자 역할 Enum — 역할 문자열을 코드 내 직접 사용 금지. 반드시 이 Enum으로 참조한다.
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
public enum UserRole {
    /** 외부 인력 (프리랜서 / 파트너사 직원) */
    TALENT,
    /** 프로젝트 매니저 — 인력 검색·선발·진척 관리 */
    PM,
    /** 구매부 — 계약·정산 전담 */
    PROCUREMENT,
    /** 시스템 관리자 — 계정·권한·시스템 설정·통계 */
    SYSTEM_ADMIN,
    /** 서비스 관리자 — 전문가 경력 등록·평가·블랙리스트 운영 */
    SERVICE_ADMIN
}
