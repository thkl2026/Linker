package kr.co.linker.talent.domain;

/** 전문가 직군 소분류 (category 에 종속) */
public enum TalentField {

    // DEVELOPER
    FRONTEND,           // 프론트엔드
    BACKEND,            // 백엔드
    FULLSTACK,          // 풀스택
    MOBILE,             // 모바일
    EMBEDDED,           // 임베디드/펌웨어

    // ARCHITECT
    EA,                 // Enterprise Architect
    TA_SYSTEM,          // 시스템 TA
    TA_NETWORK,         // 네트워크 TA
    TA_CLOUD,           // 클라우드 TA
    AA,                 // Application Architect
    SA,                 // Solution Architect
    DA,                 // Data Architect

    // DATA
    DBA_RDBMS,          // DBA (RDBMS)
    DBA_NOSQL,          // DBA (NoSQL)
    DATA_ENGINEER,      // 데이터 엔지니어
    DATA_ANALYST,       // 데이터 분석가
    ML_ENGINEER,        // AI/ML 엔지니어

    // SECURITY
    ISMS,               // 정보보안/ISMS
    NETWORK_SEC,        // 네트워크 보안
    APP_SEC,            // 애플리케이션 보안
    CLOUD_SEC,          // 클라우드 보안
    PENTEST,            // 모의해킹/취약점 진단

    // PM
    PROJECT_MGR,        // PM
    PMO,                // PMO/사업관리
    QA,                 // 품질관리

    // DESIGNER
    UX_PLANNER,         // 기획자
    UI_DESIGNER,        // 디자이너

    // 공통
    ETC                 // 기타
}
