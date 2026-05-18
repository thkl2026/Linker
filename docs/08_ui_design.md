# Linker - UI 디자인 정의서 (Neo-Retro Brown)

> **테마**: 클래식한 브라운 톤과 현대적인 레이아웃의 결합 — '오랜 시간 축적된 신뢰'를 시각화  
> `07_ui_standards.md`(구조·행동 표준)와 함께 적용. **컬러·타이포·컴포넌트 스타일은 본 문서가 우선**.

---

## 1. 디자인 원칙 (Design Principles)

| 원칙 | 설명 |
|------|------|
| **Neo-Retro Aesthetics** | 클래식한 브라운 톤 + 현대적 레이아웃 → '오랜 신뢰'의 시각화 |
| **Warm & Trustworthy** | 차가운 블루 대신 따뜻한 Earth 톤 → 파트너십의 온기 강조 |
| **Tactile Feedback** | 미세한 그림자·텍스처로 종이·가죽 질감 표현 → 아날로그의 편안함 |
| **Mobile-First Convenience** | 복잡한 관리를 한 손으로 해결하는 터치 기반 인터페이스 유지 |

---

## 2. 컬러 시스템 (Retro Brown Palette)

### 2.1 주요 컬러 (Brand Colors)

| 역할 | 이름 | Hex | 용도 |
|------|------|-----|------|
| **Primary** | Walnut Brown | `#451A03` | 헤더, 주요 타이틀, 핵심 액션 버튼 (신뢰·깊이감) |
| **Secondary** | Brass Gold | `#B45309` | AI 분석 결과, 강조 아이콘, 매칭 성공 알림, FAB |
| **Accent** | Warm Sand | `#FDE68A` | 인터랙티브 요소 배경, 선택 상태 강조 |
| **Background** | Cream Paper | `#FFFBEB` | 전체 앱 배경 (오래된 종이의 따뜻함) |

### 2.2 의미별 컬러 (Semantic Colors)

| 역할 | 이름 | Hex | 용도 |
|------|------|-----|------|
| **Success** | Sage Green | `#166534` | 검증 완료 Badge, 정산 승인 (차분한 그린) |
| **Warning** | Amber | `#D97706` | 이상 징후 감지(Flagging), 주의 필요 |
| **Danger** | Burnt Red | `#991B1B` | 가짜 이력 의심, 계약 해지, 에러 |
| **Info** | Slate Blue | `#1E293B` | 일반 공지, 가이드 텍스트 |

### 2.3 보조 컬러 (Surface & Text)

| 역할 | Hex | 용도 |
|------|-----|------|
| Surface (Card) | `#FFF8F0` | 카드·Bottom Sheet 배경 (크림보다 살짝 진한 아이보리) |
| Border | `#D6C4A8` | 카드 테두리, 구분선 (명함 느낌의 베이지 라인) |
| Text Primary | `#1C1003` | 본문, 제목 (딥 브라운) |
| Text Secondary | `#78503A` | 부제목, 메타 정보 (미디움 브라운) |
| Text Muted | `#A87B6A` | Caption, 날짜, Disabled (뮤트 브라운) |
| Text On Primary | `#FFFBEB` | Primary 버튼 위 텍스트 |

### 2.4 Tailwind / NativeWind 토큰 설정

```js
// tailwind.config.js (웹 + NativeWind 공통)
module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand
        primary:    '#451A03',  // Walnut Brown
        secondary:  '#B45309',  // Brass Gold
        accent:     '#FDE68A',  // Warm Sand
        background: '#FFFBEB',  // Cream Paper
        surface:    '#FFF8F0',  // Card/Sheet 배경
        border:     '#D6C4A8',  // 카드 테두리

        // Semantic
        success:    '#166534',  // Sage Green
        warning:    '#D97706',  // Amber
        danger:     '#991B1B',  // Burnt Red
        info:       '#1E293B',  // Slate Blue

        // Text
        'text-primary':   '#1C1003',
        'text-secondary': '#78503A',
        'text-muted':     '#A87B6A',
      },
      fontFamily: {
        sans:  ['Pretendard', 'sans-serif'],   // 본문
        serif: ['Noto Serif KR', 'serif'],     // 제목 강조
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 2px 8px 0 rgba(69, 26, 3, 0.10), 0 1px 2px 0 rgba(69, 26, 3, 0.06)',
        'card-hover': '0 4px 16px 0 rgba(69, 26, 3, 0.15)',
      },
    },
  },
}
```

---

## 3. 타이포그래피 (Typography)

| 구분 | 폰트 | 크기 | 스타일 | 색상 | 용도 |
|------|------|------|--------|------|------|
| **Display** | Noto Serif KR | 26px | Bold | `#451A03` | 페이지 메인 타이틀 |
| **Title** | Noto Serif KR | 22px | Bold | `#451A03` | 섹션 제목, 카드 제목 |
| **Heading** | Pretendard | 18px | SemiBold | `#1C1003` | 서브 섹션, 모달 제목 |
| **Body Default** | Pretendard | 16px | Regular | `#1C1003` | 본문 (가독성 우선 고딕) |
| **Body Small** | Pretendard | 14px | Regular | `#78503A` | 보조 본문 |
| **Caption** | Pretendard | 13px | Italic | `#A87B6A` | 보조 설명, 날짜, 메타 |
| **Badge/Label** | Pretendard | 11px | Medium | 상황별 | 상태 칩, 스코어 레이블 |
| **Input** | Pretendard | 16px | Regular | `#1C1003` | iOS 자동 줌 방지 고정 |

---

## 4. 레이아웃 (Layout)

### 4.1 모바일 구조

```
┌───────────────────────────────────────┐
│  Header (64px) — bg:#451A03           │
│  [← ]  LINKER (Brass Gold 로고)  [🔔] │
├───────────────────────────────────────┤
│                                       │
│  Content — bg:#FFFBEB                 │
│  (스크롤)                              │
│                                 ┌───┐ │
│                                 │FAB│ │  ← #B45309 (Brass Gold)
│                                 └───┘ │
├───────────────────────────────────────┤
│  Bottom Nav — bg:#2C1206 (딥 브라운)   │
│  [홈] [매칭] [챗] [계약] [프로필]      │
│  활성 탭: Brass Gold 아이콘 + 언더라인  │
└───────────────────────────────────────┘
```

### 4.2 데스크톱 확장

- `1024px+`: Bottom Nav → 좌측 Sidebar (`bg:#2C1206`, 너비 240px)
- Sidebar 활성 항목: `bg:#451A03` + Brass Gold 텍스트
- 콘텐츠 영역 최대 너비: `1280px`, `bg:#FFFBEB`

---

## 5. 컴포넌트 스타일 (Retro Styling)

### 5.1 버튼 (Buttons)

| 유형 | 스타일 | 비고 |
|------|--------|------|
| **Primary** | `bg-primary text-[#FFFBEB] rounded-lg` | 눌릴 때 `translateY(1px)` + 그림자 축소 (Neomorphism 절제) |
| **Secondary** | `border-2 border-primary text-primary bg-transparent` | |
| **Gold (AI/매칭)** | `bg-secondary text-white rounded-lg` | AI 추천·매칭 액션 전용 |
| **Ghost** | `text-secondary underline` | 인라인 링크성 |
| **Danger** | `bg-danger text-white` | 삭제·해지 |
| **FAB** | `bg-secondary` 원형, Brass Gold | 가용 상태 전환·프로젝트 등록 |

**Classic Button Press Effect** (Neomorphism 절제)
```css
/* 기본 */
box-shadow: 0 3px 0 #2D0E00, 0 4px 6px rgba(69,26,3,0.2);

/* 눌린 상태 */
transform: translateY(2px);
box-shadow: 0 1px 0 #2D0E00, 0 2px 3px rgba(69,26,3,0.2);
```

### 5.2 카드 (Cards)

**인력/프로젝트 카드 — Business Card 감성**

```
┌──────────────────────────────────────────┐  ← border: 1px #D6C4A8
│  ░░ 텍스처 배경 (bg:#FFF8F0)              │     border-radius: 12px
│                                          │     shadow: card
│  [Avatar]  홍길동          [🔖 SEAL]     │  ← Verified = 인장(Seal) 아이콘
│  (Serif)   시니어 풀스택 개발자            │
│            React 10년 · Java 8년         │
│  ──────────────────────────────────────  │  ← border-bottom: 1px dashed #D6C4A8
│  AI 스코어  [████████░░░] 82             │  ← Amber/Gold fill
│  가용: 2026.04.21 ~      [제안하기 →]    │
└──────────────────────────────────────────┘
```

- **Frame**: 명함 느낌 → `border: 1px solid #D6C4A8`, `border-radius: 12px`
- **Verified Badge**: 수작업 인장(Seal) SVG 아이콘 — `#166534` (Sage Green)
- **그림자**: `box-shadow: card` (브라운 계열 소프트 쉐도우)

### 5.3 입력 폼 (Forms)

두 가지 스타일 중 컨텍스트에 따라 선택:

| 스타일 | 사용처 | CSS |
|--------|--------|-----|
| **언더라인 스타일** | 간결한 단일 필드 (검색·빠른 입력) | `border-bottom: 2px solid #B45309`, `bg-transparent` |
| **박스 스타일** | 폼 입력, 복수 필드 | `bg:#FFF8F0`, `border: 1px solid #D6C4A8`, `rounded-lg` |

---

## 6. AI 특화 UI (Retro-Future)

### 6.1 Flagging (이상 징후 알림)

```
카드 상단 강조 띠 — 형광펜 하이라이트 효과:
┌──────────────────────────────────────────┐
│ ████ ⚠ AI 검토 필요 — 경력 기간 겹침 감지  │  ← bg:#FEF3C7, border-left: 4px #D97706
│      서류 위 형광펜 마킹 질감               │     font: Italic, color:#92400E
└──────────────────────────────────────────┘
  ↓ 탭 시
Bottom Sheet — '분석 보고서' 양식 느낌:
┌──────────────────────────────────────────┐
│  ══ AI 이력 분석 보고서 ══               │  ← Serif 폰트, 공문서 레이아웃
│  대상: 홍길동                            │
│  ─────────────────────────────────────   │
│  [의심 항목 1] 2020.01 ~ 2021.03 겹침   │
│  [의심 항목 2] React 경력 2년인데 5년    │
│  ─────────────────────────────────────   │
│  신뢰도 점수: ██████░░░░ 62/100         │
└──────────────────────────────────────────┘
```

- 고전적 **'주의' 도장 마크** 대안: `⚠` + Amber 테두리 + 공문서 스탬프 SVG

### 6.2 Match Score (매칭 점수)

아날로그 **게이지 바** — 현대적 재해석:

```
스코어  ┤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┤
        0           25           50           75          100
        
        [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░] 82
                                                ↑
                          Fill: #B45309 (Brass Gold), Track: #D6C4A8
```

- 눈금 마크(tick mark) 추가로 아날로그 계기판 느낌 강화
- 스코어 범위별: 80+ `#166534(Sage)`, 60~79 `#D97706(Amber)`, 60미만 `#991B1B(Burnt Red)`

---

## 7. 시스템 상태 및 피드백

### 7.1 로딩 (Loading)

| 상황 | 애니메이션 |
|------|-----------|
| AI 처리 중 | 잉크가 번지는 듯한 원형 확산 애니메이션 + `"AI가 분석 중이에요..."` (Italic) |
| 리스트 로딩 | Skeleton Card — `bg:#EDE0CE` (따뜻한 베이지 Skeleton) |
| AI 챗 응답 대기 | 점 세 개 타이핑 `···` (Brass Gold 색상) |
| 페이지 전환 | 모래시계 아이콘 현대적 스피너 (Primary 색상) |

### 7.2 Haptic (진동 피드백)

| 이벤트 | 진동 유형 | 느낌 |
|--------|-----------|------|
| 버튼 클릭 | `ImpactFeedbackStyle.Light` | '딸깍' 기계적 클릭감 |
| 가용 상태 전환 | `ImpactFeedbackStyle.Medium` | 토글 확인감 |
| 제안 발송 | `ImpactFeedbackStyle.Medium` | 발송 완료 확인 |
| 에러 발생 | `NotificationFeedbackType.Error` | 경고 진동 |

### 7.3 Empty State

```
         📁
    (빈 서류철 일러스트)
    Walnut Brown 선화 스타일

  "기록된 데이터가 없습니다"
   (Serif, #78503A, 18px)

  "새 인력을 등록하거나 검색해보세요"
   (Pretendard, #A87B6A, 14px)

       [+ 시작하기]  ← Gold 버튼
```

---

## 8. 07_ui_standards.md 컬러 변경 요약

> `07_ui_standards.md`의 컬러 항목을 본 문서 기준으로 **전면 대체**.

| 구 컬러 (`07`) | 신 컬러 (`08`) | 역할 |
|---------------|---------------|------|
| Primary `#1E3A8A` (Trust Blue) | `#451A03` (Walnut Brown) | 헤더·CTA |
| Warning `#F59E0B` | `#D97706` (Amber) | Flagging |
| Background `#F8FAFC` | `#FFFBEB` (Cream Paper) | 앱 배경 |
| Surface `#FFFFFF` | `#FFF8F0` (Ivory) | 카드·Sheet |
| Success `#10B981` | `#166534` (Sage Green) | 검증·승인 |
| Danger `#EF4444` | `#991B1B` (Burnt Red) | 에러·해지 |
| _(없음)_ | `#B45309` Secondary (Brass Gold) | AI·매칭·FAB |
| _(없음)_ | `#FDE68A` Accent (Warm Sand) | 선택 상태 강조 |
| _(없음)_ | `#1E293B` Info (Slate Blue) | 공지·가이드 |
