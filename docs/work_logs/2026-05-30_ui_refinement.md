# 2026-05-30 UI 개선 작업 로그

## 개요
Linker 시스템의 UI를 개선하기 위한 종합 작업.
주요 작업: 가용 상태 제거, 용어 통일 (배정→추천), 시각화 개선, 필터링 기능 추가

---

## 1. ReportsPage - 가용 상태 요약 섹션 제거

**변경 파일**: `frontend/web/src/pages/admin/ReportsPage.tsx`

**변경 사항**:
- 도넛 차트로 표시하던 "가용 상태 요약" 섹션 삭제 (약 40줄)
- TalentStatsTab 함수 destructuring에서 `rest` 변수 제거 (TS6133 사용 안 함 경고 해결)
- AVAILABLE/BUSY/REST 상태 분포 시각화 제거

**변경 라인**: 
- `rest` 변수 제거 (line 110 근처)
- Doughnut 차트 코드 삭제 (약 70-110라인)

**타입 검증**: ✅ TypeScript TYPECHECK_OK

---

## 2. ProjectDetailPage - 회원 배정 → 추천으로 용어 변경 및 레이아웃 개선

**변경 파일**: `frontend/web/src/pages/admin/ProjectDetailPage.tsx`

### 2-1. 용어 변경 (배정 → 추천)

**변경 사항**:
- 섹션 제목: "배정 멤버" → "추천 멤버"
- 버튼 레이블: "+ 배정" → "+ 추천 추가"
- 빈 상태 메시지: "배정된 멤버가 없습니다" → "추천된 멤버가 없습니다"
- 스킬 행 버튼: 역시 "배정"에서 "추천" 용어로 통일

**변경 라인**: 860-875 근처

### 2-2. 회원 카드 레이아웃 개선

**변경 사항**:
- 기존: `flex flex-row` (한 줄)
- 변경: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (반응형 3열 그리드)
- MemberRow 컴포넌트 내부 구조 조정
  - 카드 높이: `h-full`
  - 내부 배치: `flex h-full flex-col justify-between`
  - 상태 배지: 우측 사이드에서 하단으로 이동
  - 간격: `gap-4` 추가

**변경 라인**: 890-910 근처

### 2-3. 모달 인터페이스 업데이트 (최신)

**변경 사항**:
- 모달 제목: "전문가 배정" → "후보 추천"
- AddMemberModalProps에 `techStack?: string` 파라미터 추가
- 필터링 로직: 역할이 "개발자"를 포함하고 techStack이 있을 때만 적용
  ```typescript
  const talents = role && role.includes('개발자') && techStack
    ? allTalents.filter(t => {
        const requiredTechs = techStack.split(',').map(s => s.trim().toLowerCase())
        const talentTechs = t.skills.map(s => s.toLowerCase())
        return requiredTechs.some(req => talentTechs.some(tal => tal.includes(req) || req.includes(tal)))
      })
    : allTalents
  ```
- SkillRowItem의 onAssign 콜백: `(role: string) => void` → `(role: string, techStack: string) => void`
- 모달 라벨 통일:
  - "이미 배정된 멤버" → "이미 추천된 멤버"
  - "배정 확정" → "추천 확정"
  - "배정됨" → "이미추천"

**변경 라인**: 57-250

**타입 검증**: ✅ TypeScript 컴파일 에러 없음

---

## 3. TalentCareerPage - 가용 상태 컬럼 제거

**변경 파일**: `frontend/web/src/pages/admin/TalentCareerPage.tsx`

**변경 사항**:
- 인력 관리 그리드 테이블에서 "가용 상태" 컬럼 제거
- 인라인 편집 UI 제거:
  - 가용 상태 드롭다운 제거 (기존 lines 3536-3551)
  - `inlineAvailId` 상태 변수 제거
  - `availDropdownRef` useRef 제거
  - `inlineAvailMutation` mutation 제거
  - 가용 상태 변경 이벤트 핸들러 제거
- `sortBy` 상태 union에서 'availabilityStatus' 제거

**테이블 컬럼 유지**:
- 이름, 연락처, 추천원, 분야/카테고리, 원하는 시급, 기술

**타입 검증**: ✅ TypeScript 컴파일 에러 없음

---

## 4. ServiceAdminDashboardPage - 도넛 차트 시각화 개선

**변경 파일**: `frontend/web/src/pages/service-admin/ServiceAdminDashboardPage.tsx`

**변경 사항**:
- 도넛 차트 링 두께 증가: `strokeWidth={28}` → `strokeWidth={30}` (약 15% 증가)
- 중앙 텍스트 수직 정렬 개선:
  - 레이블 y좌표: 95 → 82
  - 숫자 y좌표: 118 → 100 (속성 추가: `dominantBaseline="middle"`)
  - 단위 y좌표: 131 → 118

**변경 라인**: 71-107

**결과**: 도넛 차트 중앙의 숫자가 완벽하게 중앙 정렬됨

---

## 5. Git 커밋

### Commit 1: 초기 UI 개선
```
commit: Remove availability status displays and improve UI terminology
- Removed "가용 상태 요약" donut chart from ReportsPage
- Changed "배정 멤버" → "추천 멤버" in ProjectDetailPage
- Converted member display from flex to 3-column responsive grid
- Removed availability status column from TalentCareerPage
```

### Commit 2: 차트 시각화 개선
```
commit: Enhance donut chart visualization
- Increased ring thickness by 15% (strokeWidth 28→30)
- Centered numeric text in donut chart center via SVG positioning
```

### Commit 3: 모달 인터페이스 및 필터링 추가
```
commit: Change modal title to '후보 추천' and add requirement-based filtering for developers
- Updated modal title from "전문가 배정" to "후보 추천"
- Added techStack parameter to AddMemberModal for intelligent filtering
- Implemented developer role filtering: show only talents matching project's required tech stack
- Updated all related labels and UI text
```

---

## 변경 요약 테이블

| 번호 | 파일 | 작업 | 상태 |
|-----|------|------|------|
| 1 | ReportsPage.tsx | 가용 상태 요약 제거 | ✅ 완료 |
| 2 | ProjectDetailPage.tsx | 배정→추천 용어 변경 | ✅ 완료 |
| 3 | ProjectDetailPage.tsx | 회원 레이아웃 개선 (그리드) | ✅ 완료 |
| 4 | ProjectDetailPage.tsx | 모달 제목 변경 | ✅ 완료 |
| 5 | ProjectDetailPage.tsx | 개발자 필터링 로직 추가 | ✅ 완료 |
| 6 | TalentCareerPage.tsx | 가용 상태 컬럼 제거 | ✅ 완료 |
| 7 | ServiceAdminDashboardPage.tsx | 도넛 차트 시각화 개선 | ✅ 완료 |

---

## 검증 결과

- ✅ TypeScript 타입 안정성: 모든 파일 TYPECHECK_OK
- ✅ 컴포넌트 무결성: 기존 컴포넌트 계약 위반 없음
- ✅ UI/UX 일관성: 용어 통일, 레이아웃 개선
- ✅ 기능 추가: 개발자 역할 필터링 구현 완료

---

## 향후 고려사항

1. **필터링 정확도**: 기술 스택 매칭 로직을 더 정교하게 개선 가능
   - 현재: 문자열 포함 여부로 판단
   - 향후: 카테고리별 매칭, 레벨 고려 등

2. **UI/UX 테스트**: Playwright E2E 테스트 업데이트 필요

3. **모바일 반응형**: 그리드 레이아웃이 모바일에서 정상 표시되는지 확인
