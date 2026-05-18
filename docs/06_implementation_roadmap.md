# Linker - 구현 로드맵

---

> **인프라 운영 전략**  
> - **Phase 0 ~ Phase 4**: 개발자 PC + 내부 서버 (On-Premise, Docker 기반)  
> - **Phase 5 (Cloud Migration)**: 규모 확대 시 AWS 클라우드로 전환  
> - 애플리케이션 코드 변경 없이 `SPRING_PROFILE` 환경 변수 교체만으로 인프라 전환 가능

---

## Phase 0: 개발 환경 및 그라운드룰 기반 설정 (Sprint 0, 약 1주)

### 목표: 팀 전원이 동일한 개발 규칙·도구·로컬 환경을 갖춘 상태로 Sprint 1 진입

| 항목 | 작업 |
|------|------|
| **Docker Compose** | 개발자 PC용 `docker-compose.yml` 구성 — PostgreSQL+pgvector, Redis, MinIO, Elasticsearch, Prometheus+Grafana, Loki |
| **내부 서버 준비** | 운영용 서버 Docker 설치, 네트워크 설정, 방화벽 포트 정책 수립 |
| **[Rule 4] Git 저장소** | GitHub 저장소 생성, `main`/`develop` 브랜치 보호 규칙 설정 (PR 필수·CI 통과·2인 승인) |
| **[Rule 4] Commit 규칙** | commitlint + Husky 설정 — Conventional Commits 형식 강제 |
| **[Rule 4] GitLeaks** | GitHub Actions 시크릿 스캔 훅 설정 — 민감 정보 커밋 차단 |
| **[Rule 4] Flyway** | `db/migration/` 디렉터리 구조 + `V1__init_schema.sql` 템플릿 |
| **[Rule 2] 설정 분리** | Spring Profile 3종 (`local`/`onprem`/`cloud`) + `.env.example` 커밋, 환경 변수 파일 방식 시크릿 관리 |
| **[Rule 1] 로깅 기반** | Logback JSON 포맷 설정, Loki 연동, `TransactionLoggingAspect` 구현 |
| **[Rule 3] 주석 도구** | JavaDoc Checkstyle 규칙 추가, TSDoc 린터 설정, Swagger SpringDoc 초기화 |
| **CI 파이프라인** | GitHub Actions — 빌드·단위 테스트·Checkstyle·GitLeaks 자동 실행 |
| **Nginx 설정** | 내부 서버 Nginx — Rate Limiting, SSL(Let's Encrypt), 리버스 프록시 |

---

## Phase 1: 기반 구축 (Sprint 1~3, 약 6주)

### 목표: 핵심 데이터 구조 + 기본 CRUD + 인증 + 모바일 앱 골격 완성

**인프라 환경: On-Premise (내부 서버 Docker)**

| 항목 | 작업 |
|------|------|
| 인프라 | Docker Compose로 PostgreSQL+pgvector+Redis+MinIO 구동, Flyway 마이그레이션 적용 |
| Spring Boot | 프로젝트 초기화, 계층형 패키지 구조 (`controller/service/repository/domain`), Profile 3종 설정 |
| **실명인증** | **NICE/KCB 본인확인 API 연동** — 가입 시 이름·휴대폰 OTP 검증, CI/DI AES-256-GCM 저장 |
| **2FA** | **TOTP (Google Authenticator)** + SMS OTP 구현 — 가입 완료 조건, 미설정 시 로그인 차단 |
| 인증 기반 | Spring Security + JWT (Access 15분 / Refresh 7일), RBAC (TALENT/PM/PROCUREMENT/ADMIN) |
| 계정 보안 | 로그인 5회 실패 → 30분 잠금, Refresh Token Redis 블랙리스트, 세션 무효화 API |
| 보안 인프라 | **Nginx Rate Limiting** (OWASP 기준), Redis 기반 App 레벨 Rate Limit, 보안 HTTP 헤더 |
| 핵심 테이블 | **users, identity_verifications, partner_companies**, talent_profiles, project_opportunities DDL |
| 개인정보 암호화 | AES-256-GCM 암호화 유틸 구현, **환경 변수 기반 키 관리** (`EncryptionKeyProvider`), hash 인덱스 |
| 기본 CRUD | users, talent_profiles, project_opportunities 기본 API |
| **파일 업로드** | **MinIO** Pre-signed URL 발급, **ClamAV** 바이러스 스캔 (`VirusScanService` 구현) |
| 알림 기반 | notifications 테이블, 인앱 알림 + **FCM 직접 연동** 푸시 알림 (AWS SNS 없음) |
| 감사 로그 | audit_logs AOP 기반 자동 기록 (IP, User-Agent, before/after 스냅샷) |
| **웹 앱** | React 18 + Vite 프로젝트 초기화, React Router v6, PWA Plugin 설정 |
| **모바일 앱** | React Native (Expo) 프로젝트 초기화, 공통 컴포넌트·네비게이션 구조 설정 |
| **UI 토큰** | `tailwind.config.js` Neo-Retro Brown 컬러 토큰 설정, NativeWind 연동 |
| **공통 컴포넌트** | Button (Full-width, 44px 터치), Card (Swipe), Bottom Sheet, Skeleton, Toast + Haptic |

**우선 구현 기능**: F-1.2 (가용 상태 관리), REQ-01, REQ-04

---

## Phase 2: AI 핵심 기능 + 모바일 주요 화면 (Sprint 4~7, 약 8주)

### 목표: 비동기 AI 파이프라인 + 매칭 완성 + 모바일 Talent 핵심 기능

**인프라 환경: On-Premise 유지 (내부 서버 Docker)**

| 항목 | 작업 |
|------|------|
| 비동기 인프라 | **Spring @Async + BlockingQueue** (`AsyncJobQueue` 온프레미스 구현), AI Worker (Virtual Thread), SSE 완료 푸시 |
| 이력서 파싱 | LangChain4j + LLM API 연동, PDF 파싱 파이프라인 (F-1.1) |
| 임베딩 | OpenAI/Gemini Embedding API 연동, profile_embedding 생성 (F-1.4) |
| 스코어링 | AI 다차원 스코어링 + 콜드스타트 보정 + score_history 기록 (F-1.3) |
| 이력 검증 | AI 날짜 겹침·모순 분석 (F-1.5), Red-flag 생성 (F-1.9) |
| AI 매칭 | 벡터 유사도 쿼리 + 예산/근무형태 필터 + match_proposals 생성 (F-2.2) |
| 인터뷰 관리 | interview_records CRUD, 일정 조율 API (F-2.3) |
| **모바일: Talent** | 가용 상태 토글(FAB), 알림 수신, 프로필 조회·수정, 타임시트 등록 화면 — UI 표준 적용 (Bottom Sheet, Pull-to-Refresh, Haptic) |
| **AI 챗 기반** | Redis 세션 관리, LangChain4j ConversationChain 구성, WebSocket 스트리밍 |

**우선 구현 기능**: F-1.1, F-1.3, F-1.4, F-1.5, F-1.9, F-2.2, F-6.2, F-6.3

---

## Phase 3: 계약·정산 워크플로우 + AI 챗 1차 (Sprint 8~10, 약 6주)

### 목표: 구매부 프로세스 + ERP 연동 + AI 챗 핵심 Tool 완성

**인프라 환경: On-Premise 유지**

| 항목 | 작업 |
|------|------|
| 파트너사 관리 | partner_companies 승인 워크플로우 (구매부 전용) |
| 계약 관리 | contracts CRUD, 계약서 PDF 생성 + S3 저장 (F-3.1) |
| 단가 분석 | ai_price_analysis JSONB 리포트 생성 (F-3.2) |
| 타임시트 | timesheets 등록·승인 워크플로우, ai_anomaly_flag 기반 이상 감지 |
| 자동 정산 | 정산액 자동 계산 + ERP 연동 인터페이스 확정 (F-5.1, F-5.2) |
| 알림 확장 | Slack/Email 채널 연동, notifications retry 처리 |
| **AI 챗 Tool** | `searchTalents`, `getMyProfile`, `updateAvailability`, `getSettlementStatus` Tool 구현 (F-6.1~6.3, 6.5) |
| **모바일: 챗** | AI 챗 화면 (WebSocket 스트리밍, 타이핑 애니메이션, Quick Reply 칩, 인라인 액션 버튼) — UI 표준 적용 |
| **모바일: 정산** | 정산 현황·지급 예정일 조회 화면 |

---

## Phase 4: 수행 모니터링 + 피드백 + AI 챗 고도화 (Sprint 11~13, 약 6주)

### 목표: AI 감시 체계 완성 + 챗 전 액터 확장

**인프라 환경: On-Premise 유지 — 이 시점에 클라우드 전환 필요성 평가**

| 항목 | 작업 |
|------|------|
| 업무 보고 분석 | 감성 분석, 리스크 레벨 산정 (F-4.1) |
| 타임시트 검증 | AI 이상 징후 감지 (F-4.2) |
| 피드백 객관화 | PM 평가 → AI KPI 변환 (F-4.3) |
| TrustScore | 피드백 신뢰도 지수 산출 (F-4.4) |
| 모니터링 스택 | Prometheus + Grafana 대시보드, CloudWatch 로그 연동 |
| 통합 대시보드 | 전사 외부 인력 운영 현황 대시보드 (F-5.3) |
| **AI 챗 확장** | `submitWorkReport`, `compareCandiates`, `generateInterviewGuide` Tool 추가 (F-6.4, 6.6, 6.7) |
| **챗 웹 UI** | PM용 웹 AI 챗 패널, 후보자 비교·인터뷰 가이드 챗 인터페이스 |
| **챗 이력** | chat_histories 저장, 대화 요약 생성 (F-6.9) |
| **모바일: 보고** | 업무 보고 챗 초안 생성·제출 화면 (F-6.4) |

---

## Phase 5: 기능 고도화 (Sprint 14~, 이후)

**인프라 환경: On-Premise 유지 (클라우드 전환 전)**

| 항목 | 작업 |
|------|------|
| 외부 인증 연동 | 학력검증·자격증 API 연동 → verification_logs 기록 (F-1.6) |
| 자가 증명 가점 | GitHub/블로그 분석 → bonus_score 부여 (F-1.7) |
| 프로젝트 실존성 | 웹 검색 대조 (F-1.8) |
| 인터뷰 가이드 | Red-flag 기반 질문 자동 생성 → match_proposals.interview_guide (F-2.5) |
| Peer Review | 익명 다면 평가 시스템 (F-4.5) |
| Elasticsearch | 정교한 검색·필터 강화 (자연어 인력 검색) |

---

## Phase 6: Cloud Migration (규모 확대 시점)

> **전환 트리거 기준** (아래 중 하나라도 해당 시 클라우드 전환 검토):
> - 동시 접속 사용자 500명 이상 지속
> - 내부 서버 CPU/Memory 사용률 70% 이상 상시 유지
> - 멀티 노드 고가용성(HA) 요구 발생
> - 재해복구(DR) 요구사항 발생

### 6.1 전환 순서 (Zero-Downtime 원칙)

```
① DB 마이그레이션 (데이터 이전이 가장 위험 → 먼저 검증)
   PostgreSQL Docker → AWS RDS (pg_dump + DMS 병행 복제)

② 파일 스토리지 전환
   MinIO → AWS S3 (aws s3 sync 명령으로 일괄 이전)
   FileStorageService 구현체 교체 (코드 변경 없음, Profile만 변경)

③ 캐시 전환
   Redis Docker → AWS ElastiCache (접속 정보만 교체)

④ 비동기 큐 전환
   BlockingQueue → AWS SQS (AsyncJobQueue 구현체 교체)

⑤ 앱 서버 컨테이너화
   Docker Compose → AWS EKS (기존 Dockerfile 재활용)

⑥ 보안 강화 (클라우드 전용)
   Nginx Rate Limit → AWS WAF v2
   환경 변수 키 → AWS KMS + Secrets Manager
   FCM 직접 → AWS SNS + FCM
```

### 6.2 전환 체크리스트

| 항목 | 확인 | 담당 |
|------|------|------|
| `SPRING_PROFILE=cloud` 전환 후 전체 통합 테스트 통과 | — | Backend |
| DB 데이터 정합성 검증 (레코드 수·체크섬) | — | DBA |
| MinIO → S3 파일 누락 0건 확인 | — | Infra |
| 암호화 키 마이그레이션 후 복호화 정상 확인 | — | Security |
| 성능 부하 테스트 (k6) — On-Prem 대비 응답시간 동등 이상 | — | QA |
| 모니터링 대시보드 CloudWatch 전환 확인 | — | Infra |

---

## 테스트 전략

### 그라운드룰 준수 체크리스트 (`00_ground_rules.md` 기준)

| 항목 | 확인 시점 |
|------|-----------|
| `@Transactional` 메서드에 AOP 로그 적용 확인 | Phase 0 완료 후 |
| `TransactionLoggingAspect` 단위 테스트 통과 | Phase 0 완료 후 |
| `application.yml` 하드코딩 값 0건 (Checkstyle 통과) | PR 병합 시 CI 자동 확인 |
| 퍼블릭 메서드 JavaDoc/TSDoc 100% 작성 | PR 병합 시 Checkstyle 자동 확인 |
| Flyway 마이그레이션 버전 순번 누락 없음 | Phase 1 완료 후 |
| GitLeaks 스캔 통과 (시크릿 커밋 0건) | PR 병합 시 CI 자동 확인 |

### UI 표준 준수 체크리스트 (`07_ui_standards.md` 기준)

| 항목 | 확인 |
|------|------|
| 모든 터치 요소 44×44px 이상 | Phase 1 완료 후 |
| Input 폰트 16px 고정 (iOS 줌 방지) | Phase 1 완료 후 |
| Bottom Sheet 사용 (모달 대체) | Phase 2 완료 후 |
| Horizontal Bar 스코어 시각화 | Phase 2 완료 후 |
| Flagging 카드 띠 + Bottom Sheet | Phase 2 완료 후 |
| Quick Reply 칩 챗 UI | Phase 3 완료 후 |

### 레이어별 테스트

| 레이어 | 도구 | 대상 | 목표 커버리지 |
|--------|------|------|---------------|
| 단위 테스트 | JUnit 5 + Mockito | Service 비즈니스 로직, 스코어링 계산, 매칭 필터 | 80% 이상 |
| 통합 테스트 | Spring Boot Test + Testcontainers | Repository ↔ PostgreSQL, 실제 DB 연동 | 핵심 경로 100% |
| API 테스트 | MockMvc / RestAssured | Controller 엔드포인트, 인증·인가 체크 | 전체 API |
| AI 파이프라인 | WireMock | LLM API Stub, 파싱 결과 검증 | 주요 시나리오 |
| E2E 테스트 | Playwright | 이력서 등록 → 매칭 → 계약 골든 패스 | 핵심 유즈케이스 |

### 테스트 원칙
- Repository 테스트는 **Testcontainers** (실제 PostgreSQL) 사용 — 모킹 금지
- AI Worker 테스트는 **WireMock**으로 LLM API 스터빙 (비용·속도 제어)
- CI 파이프라인: PR 시 단위+통합 테스트 필수 통과 조건

---

## API 설계 개요

### User / Auth API
```
# 가입 플로우
POST   /api/v1/auth/register/initiate          # 1단계: 이메일·비밀번호 임시 저장, 실명인증 세션 발급
POST   /api/v1/auth/register/identity-verify   # 2단계: NICE/KCB 본인확인 결과 검증 (CI/DI 저장)
POST   /api/v1/auth/register/mfa-setup         # 3단계: TOTP QR 시드 발급 or SMS 번호 등록
POST   /api/v1/auth/register/complete          # 4단계: OTP 확인 후 계정 활성화

# 로그인 플로우
POST   /api/v1/auth/login                      # 1단계: 이메일·비밀번호 검증 → MFA 챌린지 토큰 발급
POST   /api/v1/auth/mfa/verify                 # 2단계: TOTP/SMS OTP 검증 → JWT 발급
POST   /api/v1/auth/refresh                    # Access Token 갱신
POST   /api/v1/auth/logout                     # Refresh Token 블랙리스트 등록

# 계정 관리
GET    /api/v1/users/me                        # 내 계정 조회
PUT    /api/v1/users/me/password               # 비밀번호 변경
POST   /api/v1/auth/mfa/backup-codes           # 백업 코드 재발급
POST   /api/v1/auth/password-reset/request     # 비밀번호 재설정 이메일 발송
POST   /api/v1/auth/password-reset/confirm     # 재설정 토큰 검증 + 신규 비밀번호 적용
```

### Partner Company API
```
POST   /api/v1/partner-companies       # 파트너사 등록 신청
PUT    /api/v1/partner-companies/{id}/approve  # 구매부 승인
GET    /api/v1/partner-companies       # 파트너사 목록 (Admin/Procurement)
```

### Talent API
```
POST   /api/v1/upload/presigned        # S3 Pre-signed URL 발급
POST   /api/v1/talents/resume          # 이력서 파싱 요청 → 202 Accepted (F-1.1)
GET    /api/v1/talents/resume/status/{jobId}   # AI 처리 상태 폴링
GET    /api/v1/talents/{id}            # 프로필 조회
PUT    /api/v1/talents/{id}/availability       # 가용 상태 변경 (F-1.2)
GET    /api/v1/talents/{id}/score      # AI 스코어 조회 (F-1.3)
GET    /api/v1/talents/{id}/score/history      # 스코어 이력
```

### Project API
```
POST   /api/v1/projects                # 프로젝트 등록 (F-2.1)
GET    /api/v1/projects/{id}/recommendations   # AI 인력 추천 (F-2.2)
POST   /api/v1/projects/{id}/proposals/{talentId}      # 제안 발송 (F-2.3)
PUT    /api/v1/proposals/{id}/respond  # 제안 수락/거절
POST   /api/v1/proposals/{id}/interviews       # 인터뷰 일정 등록
PUT    /api/v1/interviews/{id}/result  # 인터뷰 결과 기록
```

### Contract API
```
POST   /api/v1/contracts               # 계약 생성 (F-3.1)
GET    /api/v1/contracts/{id}/price-analysis   # 단가 분석 (F-3.2)
PUT    /api/v1/contracts/{id}/sign     # 전자 서명
GET    /api/v1/contracts/{id}/file     # 계약서 다운로드 (Pre-signed URL)
```

### Timesheet & Settlement API
```
POST   /api/v1/timesheets              # 공수 등록
PUT    /api/v1/timesheets/{id}/approve # 승인 (PM/구매부)
GET    /api/v1/contracts/{id}/settlement       # 정산 내역 (F-5.1)
PUT    /api/v1/contracts/{id}/settlement/approve       # 정산 최종 승인 (F-5.2)
```

### Evaluation API
```
POST   /api/v1/evaluations             # 피드백 등록 (F-4.3)
GET    /api/v1/evaluations/{id}/trust-score    # 신뢰도 (F-4.4)
POST   /api/v1/work-reports            # 업무 보고 등록 (F-4.1)
```

### Notification API
```
GET    /api/v1/notifications           # 알림 목록
PUT    /api/v1/notifications/{id}/read # 읽음 처리
GET    /api/v1/notifications/stream    # SSE 구독 (AI 완료·리스크 알림 실시간 푸시)
POST   /api/v1/notifications/push/token  # 모바일 FCM 토큰 등록
```

### AI Chat API
```
POST   /api/v1/chat/sessions           # 챗 세션 시작
WS     /ws/chat/{sessionId}            # WebSocket 연결 (스트리밍)
GET    /api/v1/chat/sessions/{id}/history  # 대화 이력 조회
DELETE /api/v1/chat/sessions/{id}      # 세션 종료 (요약 저장)
```

### Audit API (Admin 전용)
```
GET    /api/v1/audit-logs              # 감사 로그 조회
GET    /api/v1/audit-logs?targetType=contracts&targetId={id}  # 특정 엔티티 이력
```

---

## 모바일 화면 구성 (React Native)

### Talent 앱 네비게이션

```
Bottom Tab
├── 홈          — 내 스코어, 가용 상태 토글, 최근 알림
├── 챗          — AI 챗 어시스턴트 (F-6.2~6.4)
├── 업무        — 타임시트 등록, 업무 보고 제출
├── 정산        — 정산 현황, 지급 예정일
└── 프로필      — 내 프로필·이력 조회·수정
```

### PM 앱 (경량 — 알림·승인 중심)
```
Bottom Tab
├── 홈          — 진행 프로젝트 현황, 리스크 알림
├── 챗          — AI 인력 검색·후보자 비교
├── 승인        — 타임시트·업무보고 승인 처리
└── 알림        — 전체 알림 목록
```
