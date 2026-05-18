# Linker - UI 표준 정의서 (Mobile-First)

> 모든 인터페이스는 모바일(Small Screen)에서 최적의 경험을 제공하며,  
> 데스크톱으로 확장되는 **Mobile-First 반응형** 구조를 기본 원칙으로 한다.

---

> **컬러·타이포그래피·컴포넌트 시각 스타일은 `08_ui_design.md`(Neo-Retro Brown)가 우선 적용.**  
> 본 문서는 구조·동작·접근성 표준을 정의한다.

## 1. 디자인 원칙 (Design Principles)

| 원칙 | 설명 |
|------|------|
| **Mobile-First Response** | 모바일 최적 경험 → 데스크톱 확장 순서로 설계 |
| **Touch-Friendly** | 모든 인터랙티브 요소 최소 **44×44px** 터치 영역 확보, Swipe 제스처 적극 활용 |
| **Glanceable Data** | 좁은 화면에서도 AI 스코어·가용성·리스크를 한눈에 파악할 수 있는 요약 UI 제공 |
| **Push-Driven** | 앱/웹을 열지 않아도 핵심 알림을 즉시 인지할 수 있도록 FCM 푸시 유도 |
| **Neo-Retro Aesthetics** | Walnut Brown + Brass Gold의 신뢰감 있는 레트로 감성 (`08_ui_design.md` 참조) |

---

## 2. 컬러 시스템 (Color Palette)

> **`08_ui_design.md` 기준으로 전면 대체된 최신 컬러 시스템.**

| 역할 | 이름 | Hex | 사용처 |
|------|------|-----|--------|
| **Primary** | Walnut Brown | `#451A03` | 헤더, 주요 액션 버튼, 활성 탭 |
| **Secondary** | Brass Gold | `#B45309` | AI 분석·매칭 강조, FAB |
| **Accent** | Warm Sand | `#FDE68A` | 선택 상태 강조, 인터랙티브 배경 |
| **Background** | Cream Paper | `#FFFBEB` | 전체 앱 배경 |
| **Surface** | Ivory | `#FFF8F0` | 카드·Bottom Sheet·모달 배경 |
| **Success** | Sage Green | `#166534` | 검증 완료 Badge, 정산 승인 |
| **Warning** | Amber | `#D97706` | Flagging, 이상 징후, 주의 필요 |
| **Danger** | Burnt Red | `#991B1B` | 에러, 계약 해지, 가짜 이력 의심 |
| **Info** | Slate Blue | `#1E293B` | 일반 공지, 가이드 텍스트 |
| **Text Primary** | Deep Brown | `#1C1003` | 본문, 제목 |
| **Text Secondary** | Medium Brown | `#78503A` | 부제목, 메타 정보 |
| **Text Muted** | Muted Brown | `#A87B6A` | Caption, 날짜, Disabled |

### Tailwind / NativeWind 토큰 설정

```js
// tailwind.config.js (웹 + NativeWind 공통) — 08_ui_design.md 기준
module.exports = {
  theme: {
    extend: {
      colors: {
        primary:    '#451A03',  // Walnut Brown
        secondary:  '#B45309',  // Brass Gold
        accent:     '#FDE68A',  // Warm Sand
        background: '#FFFBEB',  // Cream Paper
        surface:    '#FFF8F0',  // Ivory
        border:     '#D6C4A8',  // Beige Line
        success:    '#166534',  // Sage Green
        warning:    '#D97706',  // Amber
        danger:     '#991B1B',  // Burnt Red
        info:       '#1E293B',  // Slate Blue
      },
      fontFamily: {
        sans:  ['Pretendard', 'sans-serif'],
        serif: ['Noto Serif KR', 'serif'],
      },
    },
  },
}
```

---

## 3. 타이포그래피 (Typography)

| 구분 | 크기 | 비고 |
|------|------|------|
| **Default Body** | `16px` | 모바일 가독성 확보 (기존 14px → 상향) |
| **Input Field** | `16px` | iOS 자동 줌(zoom) 현상 방지 필수 |
| **Heading 1** | `24px` / `font-bold` | 페이지 타이틀 |
| **Heading 2** | `20px` / `font-semibold` | 섹션 제목 |
| **Caption** | `12px` | 메타 정보, 날짜, 상태 레이블 |
| **Badge** | `11px` / `font-medium` | 상태 칩, 스코어 레이블 |

---

## 4. 레이아웃 시스템 (Layout & Grid)

### 4.1 모바일 레이아웃 구조

```
┌─────────────────────────────────┐
│  Header (고정, 64px)             │
│  [← Back]  [Title]  [🔔] [☰]   │
├─────────────────────────────────┤
│                                 │
│          Content Area           │
│      (스크롤 가능 영역)           │
│                                 │
│                     ┌─────────┐ │
│                     │   FAB   │ │
│                     │ (+/토글) │ │
│                     └─────────┘ │
├─────────────────────────────────┤
│  Bottom Navigation (고정)        │
│  [홈] [매칭/검색] [계약/정산] [프로필] │
└─────────────────────────────────┘
```

**Bottom Navigation 탭 구성**

| 탭 | 아이콘 | 대상 액터 |
|----|--------|-----------|
| 홈 | House | All |
| 매칭/검색 | Search | PM, Admin |
| 챗 | Chat bubble | All |
| 계약/정산 | Document | Talent, Procurement |
| 프로필 | Person | All |

**FAB (Floating Action Button)**
- 위치: 하단 우측, Bottom Navigation 위 `bottom: 80px, right: 16px`
- Talent: 가용 상태 원터치 전환
- PM: 빠른 프로젝트 등록

### 4.2 데스크톱 확장 구조

```
breakpoint: lg (1024px+) → Bottom Navigation 숨김 → 좌측 Sidebar 표시

┌──────────┬──────────────────────────────┐
│ Sidebar  │  Header (64px)               │
│ (240px)  ├──────────────────────────────┤
│          │                              │
│ [홈]     │       Content Area           │
│ [매칭]   │       (최대 너비 1280px)      │
│ [챗]     │                              │
│ [계약]   │                              │
│ [정산]   │                              │
│ [프로필] │                              │
└──────────┴──────────────────────────────┘
```

### 4.3 반응형 브레이크포인트

| 이름 | 너비 | 레이아웃 |
|------|------|---------|
| `sm` | 390px+ | 모바일 기본 |
| `md` | 768px+ | 태블릿 — 2컬럼 그리드 |
| `lg` | 1024px+ | 데스크톱 — Sidebar 전환 |
| `xl` | 1280px+ | 와이드 — 콘텐츠 최대 너비 고정 |

---

## 5. 컴포넌트 표준 (Mobile-Optimized)

### 5.1 버튼 (Button)

| 유형 | 스타일 | 사용처 |
|------|--------|--------|
| **Primary** | `bg-primary text-white` full-width, `h-12` | 주요 CTA (제출, 서명, 승인) |
| **Secondary** | `border border-primary text-primary` | 보조 액션 (취소, 수정) |
| **Danger** | `bg-danger text-white` | 삭제, 계약 해지 |
| **Ghost** | `text-primary` (배경 없음) | 인라인 링크성 액션 |

- 모바일 화면 하단 CTA: **Full-width** (`w-full`) — 엄지손가락 접근성
- 모든 인터랙티브 요소 간 최소 간격: `gap-2` (8px)
- 최소 터치 영역: `min-h-[44px] min-w-[44px]`

### 5.2 카드 (Card)

```
┌─────────────────────────────────────┐
│ [Avatar] 이름          [스코어 Bar] │  ← Glanceable
│          역할 · 경력               │
│          [기술 태그] [기술 태그]    │
│ ─────────────────────────────────  │
│ [가용] 2026.04.21 ~    [제안 보내기]│
└─────────────────────────────────────┘
```

- 인력 카드는 **Swipe 가능** (좌: 관심 저장 / 우: 제안 발송)
- **Pull-to-Refresh**: 리스트 상단에서 아래로 당기기 → 최신 데이터 갱신

### 5.3 AI 스코어 시각화

```
원형 프로그레스 ❌ → 수평 바 (Horizontal Bar) ✅

이름: 홍길동
스코어 [████████░░] 82 / 100
         ↑ primary 색상 fill, 배경 #E5E7EB
```

- 공간 효율 우선 → **Horizontal Progress Bar** 표준
- 스코어 범위별 색상: 80+ `success`, 60~79 `warning`, 60미만 `danger`

### 5.4 AI Flagging (이상 징후)

```
카드 상단 Warning 띠:
┌─ ⚠ AI 검토 필요 — 경력 기간 겹침 감지 ─────────────────┐
│  [자세히 보기]                                         ↓  │
└───────────────────────────────────────────────────────┘
```

- 카드 상단 **컬러 코드 띠** (`bg-warning/10 border-l-4 border-warning`)
- 탭 시 → **Bottom Sheet**로 AI 분석 요약 팝업 노출

---

## 6. 상태 및 피드백 패턴

### 6.1 Bottom Sheet

모바일에서 **모달 창 대신 Bottom Sheet** 사용 (한 손 조작 편의성)

```
사용처:
- AI Flagging 상세 분석
- 가용 상태 변경 확인
- 필터 옵션 선택
- 인터뷰 일정 등록
- 정산 상세 내역
```

### 6.2 Toast & Haptic

| 이벤트 | Toast | Haptic |
|--------|-------|--------|
| 가용 상태 변경 성공 | `"가용 상태가 변경되었습니다"` (2초) | 성공 진동 (Light) |
| 제안 발송 성공 | `"제안을 발송했습니다"` (2초) | 성공 진동 (Light) |
| 업무 보고 제출 완료 | `"보고서가 제출되었습니다"` (2초) | 성공 진동 (Medium) |
| 오류 발생 | `"오류가 발생했습니다. 다시 시도해주세요"` | 오류 진동 (Heavy) |

- Haptic: `expo-haptics` 라이브러리 사용 (`Haptics.ImpactFeedbackStyle`)

### 6.3 로딩 상태

| 상황 | 처리 |
|------|------|
| AI 처리 중 (이력서 파싱·매칭) | Skeleton UI + `"AI가 분석 중이에요..."` 문구 |
| 리스트 첫 로딩 | Skeleton Card × 3 |
| AI 챗 응답 대기 | 점 세 개 타이핑 애니메이션 (`...`) |
| 페이지 이동 | Bottom Navigation 탭 아이콘 스피너 |

---

## 7. AI 챗 UI 표준

### 7.1 챗 화면 레이아웃

```
┌─────────────────────────────────┐
│  Header: AI 어시스턴트    [×]   │
├─────────────────────────────────┤
│                                 │
│  [AI] 안녕하세요! 무엇을        │
│       도와드릴까요?             │
│                                 │
│              [나] React 가용    │ ← 우측 정렬, primary bg
│                  개발자 찾아줘  │
│                                 │
│  [AI] 조건에 맞는 인력 2명을    │ ← 좌측 정렬, surface bg
│       찾았습니다.               │
│       ┌─────────────────────┐   │
│       │ 홍길동 · 스코어 87  │   │ ← 인라인 카드
│       │ [████████░] React 5년│  │
│       └─────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│ [추천 질문 칩] [칩] [칩]        │  ← Quick Reply 칩
├─────────────────────────────────┤
│ [📎]  메시지를 입력하세요...  [↑]│
└─────────────────────────────────┘
```

### 7.2 Quick Reply 칩

액터별 자주 쓰는 질문을 **칩(Chip)** 형태로 제공 → 타이핑 없이 원터치 실행

| 액터 | 기본 칩 예시 |
|------|------------|
| Talent | `내 스코어 확인` `가용 상태 변경` `이번 달 정산` `업무 보고 작성` |
| PM | `인력 검색` `후보자 비교` `인터뷰 질문 생성` `리스크 현황` |
| Procurement | `정산 대기 건` `계약 만료 예정` |

### 7.3 챗 내 인라인 액션

AI 응답 안에 **액션 버튼 내장** → 앱 화면 전환 없이 완결

```
[AI] 홍길동에게 제안을 발송할까요?
     ┌──────────┐  ┌──────┐
     │ 제안 발송 │  │ 취소 │
     └──────────┘  └──────┘
```

---

## 8. 접근성 (Accessibility)

| 항목 | 기준 |
|------|------|
| 색상 대비 | WCAG AA 기준 (일반 텍스트 4.5:1 이상) |
| 터치 영역 | 최소 44×44px (Apple HIG / Google Material 기준) |
| 동적 텍스트 | 시스템 폰트 크기 설정 대응 (`accessibilityLabel`, `aria-label`) |
| 스크린 리더 | React Native `accessibilityRole`, 웹 `role` / `aria-*` 속성 |
