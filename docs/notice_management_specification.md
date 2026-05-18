# Linker 공지사항 관리(Notice Management) 시스템 명세서

본 문서는 Linker 플랫폼의 공지사항 관리 시스템에 대한 기획 의도, 분류 체계 및 UI/UX 상세 설계를 정리합니다.

---

## 1. 시스템 개요 (System Overview)
- **목적**: 플랫폼 운영 및 정책, 기능 업데이트 등 중요 정보를 관리자가 효율적으로 공지하고 사용자가 쉽게 확인할 수 있는 환경 구축.
- **주요 타겟**: Linker 플랫폼 관리자 (운영팀, 마케팅팀, 개발팀 등).
- **디자인 철학**: **Thinklair**의 브랜드 아이덴티티(Navy/Gold, Serif Typography)를 계승하여 신뢰감 있고 전문적인 어드민 인터페이스 제공.

---

## 2. 공지사항 분류 체계 (Classification System)
플랫폼 운영 성격에 따라 4가지 핵심 카테고리로 분류하여 필터링 기능을 제공합니다.

| 카테고리 | 설명 | 주요 내용 예시 |
| :--- | :--- | :--- |
| **[전체]** | 모든 공지사항 통합 조회 | - |
| **[운영/시스템]** | 서비스 운영 및 기술 관련 안내 | 정기 점검, 서버 증설, 시스템 리뉴얼, 기능 업데이트 등 |
| **[비즈니스/정책]** | 계약 및 핵심 정책 관련 공지 | 매칭 수수료 변경, 이용 약관 개정, 신규 협약 체결 안내 등 |
| **[가이드/교육]** | 사용자 활용 정보 제공 | 이력서 작성 팁, 스택 표기법 가이드, 서비스 이용 매뉴얼 등 |

---

## 3. UI/UX 상세 설계 (Design Specifications)

### 3.1 브랜드 아이덴티티 (BI)
- **Primary Color**: `#1A4266` (Thinklair Navy)
- **Secondary Color**: `#B45309` (Thinklair Gold)
- **Logo Font**: `Cormorant Garamond` (Elegant Serif)
- **Body Font**: `Pretendard` (Modern Sans-serif)

### 3.2 주요 화면 구성 요소
1.  **필터 바 (Filter Bar)**: 카테고리별 퀵 필터 버튼 및 제목/내용 검색 기능.
2.  **공지 목록 (Notice List)**:
    - **번호**: 고정 공지는 핀(📌) 아이콘으로 표시.
    - **카테고리**: 각 성격에 맞는 컬러 배지 적용.
    - **제목**: 클릭 시 상세 보기 모달 오픈.
    - **작성자**: 아바타와 부서명(운영팀, 개발팀 등)을 함께 표시하여 책임 소재 명확화.
    - **조회수**: 실시간 인기도 측정.
3.  **상세 보기 모달 (Detail Preview)**: 별도 페이지 이동 없이 내용을 즉시 확인하고 관리 액션을 수행할 수 있는 오버레이 구조.
4.  **페이지네이션 (Pagination)**: 대량의 공지 데이터 관리를 위한 페이지 이동 컨트롤.

---

## 4. 관리자 액션 (Administrative Actions)
- **수정**: 공지 내용, 카테고리, 고정 여부 변경.
- **삭제**: 불필요하거나 잘못 게시된 공지 영구 삭제.
- **숨기기**: 데이터는 유지하되 사용자 화면에서만 노출 중단.
- **상단 고정 (Pin)**: 중요한 공지를 목록 최상단에 상시 노출.

---

## 5. 관련 결과물 (Artifacts)
- **Mockup File**: [notice_management_mockup.html](file:///c:/Users/jayje/linker/frontend/web/mockup/notice_management_mockup.html)
- **BI Guidelines**: [linker_bi_presentation_mockup.html](file:///c:/Users/jayje/linker/frontend/web/mockup/linker_bi_presentation_mockup.html)

---
> [!NOTE]
> 본 시스템은 향후 실제 데이터베이스 및 API 연동을 통해 동적으로 작동하도록 개발될 예정입니다.
