package kr.co.linker.talent.domain;

/** 전문가 직군 소분류 (category 에 종속) */
public enum TalentField {
    // DEVELOPER
    FRONTEND,           // 프론트엔드 개발자
    BACKEND,            // 백엔드 개발자
    FULLSTACK,          // 풀스택 개발자
    MOBILE,             // 모바일 개발자
    EMBEDDED,           // 임베디드/펌웨어
    DEVOPS,             // DevOps/인프라

    // ARCHITECT
    SOLUTION_ARCHITECT,     // 솔루션 아키텍트
    TECHNICAL_ARCHITECT,    // Technical Architect
    APPLICATION_ARCHITECT,  // Application Architect
    CLOUD_ARCHITECT,        // 클라우드 아키텍트
    DATA_ARCHITECT,         // 데이터 아키텍트

    // DBA
    RDBMS,              // 관계형 DB 관리자
    NOSQL,              // NoSQL 관리자
    DATA_ENGINEER,      // 데이터 엔지니어

    // PM
    PROJECT_MANAGER,    // PM
    PRODUCT_OWNER,      // PO

    // ANALYST
    BUSINESS_ANALYST,   // BA
    DATA_ANALYST,       // 데이터 분석가
    QA,                 // QA 엔지니어

    // DESIGNER
    UI_UX,              // UI/UX 디자이너
    GRAPHIC,            // 그래픽 디자이너

    // PLANNER
    SERVICE_PLANNER,    // 서비스 기획자
    PRODUCT_PLANNER,    // 프로덕트 기획자
    UX_PLANNER          // UX 기획자
}
