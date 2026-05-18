# Linker - 기술 스택 설계서

---

## 1. 전체 아키텍처 개요

> **배포 전략**: PC·내부 서버(On-Premise)로 시작 → 규모 확대 시 Cloud 전환  
> 애플리케이션 코드는 환경에 무관하게 동일하며, **Spring Profile**과 **추상화 인터페이스**로 인프라를 교체한다.

```
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│   Web (PC)      │  │  Mobile App     │  │  Mobile Web      │
│   React + Vite  │  │  React Native   │  │  React PWA       │
│   Tailwind CSS  │  │  Expo           │  │  (경량 접근)      │
│   Shadcn UI     │  │  NativeWind     │  │                  │
└────────┬────────┘  └───────┬─────────┘  └──────┬───────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
                             │ REST API / SSE / WebSocket
┌────────────────────────────▼─────────────────────────────────┐
│                       Backend (Java)                          │
│          Spring Boot 3.x + Spring Security + JWT              │
│          Spring AI + LangChain4j                              │
│          Spring Data JPA (Hibernate)                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              AI Chat Engine (Module 6)                  │  │
│  │   LangChain4j ConversationChain + RAG + Tool Calling    │  │
│  │   세션별 대화 컨텍스트 관리 (Redis)                        │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────┬──────────────────────────────────────┬──────────────────┘
      │ 동기 쿼리                              │ AI 작업 비동기 발행
┌─────▼──────┐                    ┌───────────▼────────────────┐
│ PostgreSQL │                    │  AsyncJobQueue (추상화)      │
│ 16+        │                    │  On-Prem: Spring @Async     │
│ + pgvector │                    │  Cloud:   AWS SQS           │
│ + uuid-ossp│                    │  AI Worker (Virtual Thread) │
└─────┬──────┘                    └──────────┬─────────────────┘
      │                                      │
┌─────▼──────┐  ┌──────────┐      ┌──────────▼─────────────────┐
│Elasticsearch│  │  Redis   │      │   External Services         │
│(검색/필터링)│  │(챗 세션) │      │   - LLM API (Gemini/OpenAI) │
└─────────────┘  └──────────┘      │   - NICE/KCB 실명인증 API   │
                                   │   - Mail (SMTP) / FCM(푸시) │
┌────────────────────────┐         │   - ERP (재무 시스템)       │
│   Monitoring Stack     │         └────────────────────────────┘
│   Prometheus + Grafana │
│   Spring Actuator      │
└────────────────────────┘

  ┌─ On-Premise ──────────────────────────────────────────────┐
  │  Docker Compose (개발) → 내부 서버 단일 노드 (운영)          │
  │  MinIO(파일) · 로컬 SMTP · ClamAV(바이러스 스캔)            │
  └───────────────────────────────────────────────────────────┘
  ┌─ Cloud (확장 시 전환) ─────────────────────────────────────┐
  │  AWS EKS · RDS · S3 · SQS · ElastiCache · WAF · KMS       │
  └───────────────────────────────────────────────────────────┘
```

---

## 2. 스택 상세

### 2.1 Frontend — Web

| 항목 | 기술 | 용도 |
|------|------|------|
| Framework | React 18 + Vite | SPA, 빠른 번들링, PWA manifest 지원 |
| 라우팅 | React Router v6 | 클라이언트 사이드 라우팅 |
| State | TanStack Query | 서버 상태 캐싱·동기화 |
| Styling | Tailwind CSS + Shadcn UI | 디자인 시스템 (`08_ui_design.md` 토큰 적용) |
| 실시간 | SSE (Server-Sent Events) | AI 처리 완료 푸시·챗 스트리밍 수신 |
| PWA | Vite PWA Plugin (vite-plugin-pwa) | 서비스 워커·오프라인 캐시·앱 설치 지원 |
| 인증 UI | react-otp-input | OTP 입력 컴포넌트 (2FA 화면) |

### 2.2 Frontend — Mobile

| 항목 | 기술 | 용도 |
|------|------|------|
| Framework | React Native (Expo) | iOS / Android 크로스플랫폼 |
| Styling | NativeWind (Tailwind for RN) | 웹과 동일한 디자인 토큰 공유 |
| State | TanStack Query (RN 동일 사용) | 웹과 공통 서버 상태 관리 |
| 푸시 알림 | Expo Notifications + AWS SNS/FCM | 계약·정산·리스크 알림 |
| 실시간 | WebSocket | AI 챗 스트리밍 수신 |
| 오프라인 | MMKV + React Query persist | 가용 상태·공지 오프라인 캐시 |
| Haptic | expo-haptics | 주요 액션 진동 피드백 |
| 제스처 | react-native-gesture-handler | 카드 Swipe, Pull-to-Refresh |

**UI 표준 연계 (`07_ui_standards.md` 참조)**

| 규칙 | 적용값 |
|------|--------|
| 최소 터치 영역 | `min-h-[44px] min-w-[44px]` |
| Body 폰트 | `text-base` (16px) — iOS 자동 줌 방지 |
| Input 폰트 | `text-base` (16px) 고정 |
| 모달 대신 | Bottom Sheet (`@gorhom/bottom-sheet`) |
| 리스트 갱신 | Pull-to-Refresh (`RefreshControl`) |
| 인터랙티브 간격 | `gap-2` (8px) 이상 |

**2FA 인증 화면 (React 전용)**

```
가입 흐름:
① 기본 정보 입력 (이메일·비밀번호)
② 실명인증 — NICE/KCB API 팝업 (이름 + 휴대폰 본인인증)
③ 2FA 설정 선택 (TOTP 앱 / SMS OTP)
④ 인증 코드 확인 → 가입 완료
```

**공유 Tailwind 컬러 토큰**

```js
// tailwind.config.js (웹 Next.js + 모바일 NativeWind 동일 파일 참조) — 08_ui_design.md 기준
module.exports = {
  theme: {
    extend: {
      colors: {
        primary:    '#451A03',  // Walnut Brown — 헤더, CTA 버튼, 활성 탭
        secondary:  '#B45309',  // Brass Gold — AI 분석·매칭 강조, FAB
        accent:     '#FDE68A',  // Warm Sand — 선택 상태 강조
        background: '#FFFBEB',  // Cream Paper — 앱 전체 배경
        surface:    '#FFF8F0',  // Ivory — 카드, Bottom Sheet
        border:     '#D6C4A8',  // Beige Line — 구분선
        success:    '#166534',  // Sage Green — 검증 완료, 정산 완료
        warning:    '#D97706',  // Amber — Flagging, 이상 징후
        danger:     '#991B1B',  // Burnt Red — 에러, 계약 해지
        info:       '#1E293B',  // Slate Blue — 일반 공지
      },
      fontFamily: {
        sans:  ['Pretendard', 'sans-serif'],
        serif: ['Noto Serif KR', 'serif'],
      },
    },
  },
}
```

**모바일 우선 지원 기능 (Talent 중심)**

| 기능 | 설명 |
|------|------|
| 가용 상태 토글 | FAB 원터치 전환, Haptic 피드백 |
| 주간 업무 보고 제출 | AI 챗 초안 생성 + 모바일 에디터 제출 |
| 타임시트 등록 | 날짜별 공수 입력 |
| 정산 내역 확인 | 정산 현황·지급 예정일 조회 |
| 알림 수신 | 제안·인터뷰·계약·정산 FCM 푸시 |
| AI 챗 | Quick Reply 칩, 인라인 액션 버튼, 스트리밍 |

### 2.3 Backend

| 항목 | 기술 | 용도 |
|------|------|------|
| Language | Java 21 | 정적 타입, 가상 스레드 |
| Framework | Spring Boot 3.x | 계층형 아키텍처 |
| ORM | Spring Data JPA (Hibernate) | RDBMS 연동 |
| Security | Spring Security + JWT | RBAC, 인증/인가 |
| AI | Spring AI + LangChain4j | LLM 프롬프트 관리, 임베딩 |
| 비동기 | Spring `@Async` + Virtual Thread | AI 작업 논블로킹 처리 |
| Message Queue | AWS SQS | AI 작업 비동기 발행·소비 |

### 2.4 인프라 환경 전략 (On-Premise → Cloud)

#### 환경별 스택 비교

| 역할 | On-Premise (시작) | Cloud (확장) | 추상화 인터페이스 |
|------|-------------------|--------------|------------------|
| **RDBMS** | PostgreSQL 16+ (Docker) | AWS RDS PostgreSQL | — (동일 드라이버) |
| **Vector DB** | pgvector (PG 확장) | pgvector on RDS | — (동일) |
| **Search** | Elasticsearch (Docker) | AWS OpenSearch | — (동일 클라이언트) |
| **Cache / 세션** | Redis (Docker) | AWS ElastiCache | — (동일 클라이언트) |
| **파일 저장** | **MinIO** (S3 호환, 내부 서버) | AWS S3 | `FileStorageService` |
| **비동기 큐** | **Spring @Async + BlockingQueue** | AWS SQS | `AsyncJobQueue` |
| **바이러스 스캔** | **ClamAV** (Docker, 동기) | AWS Lambda + ClamAV | `VirusScanService` |
| **모바일 푸시** | **FCM 직접 연동** (AWS SNS 없음) | AWS SNS + FCM/APNs | `PushNotificationService` |
| **시크릿 관리** | **환경 변수 파일** + Docker secrets | AWS Secrets Manager | `SecretProvider` |
| **컨테이너** | **Docker Compose** (단일 노드) | AWS EKS (멀티 노드) | — |
| **리버스 프록시** | **Nginx** (Rate Limit, SSL) | AWS ALB + WAF | — |
| **모니터링** | **Prometheus + Grafana** (Docker) | CloudWatch + Grafana | — |
| **로그 수집** | **Loki** (Docker) | AWS CloudWatch Logs | — |
| **암호화 키** | **로컬 KMS** (Spring Vault / 환경 변수) | AWS KMS | `EncryptionKeyProvider` |

#### Spring Profile 전략

```yaml
# application.yml — 공통 설정
spring:
  profiles:
    active: ${SPRING_PROFILE:onprem}   # 기본값: onprem

---
# application-local.yml — 개발자 PC (Docker Compose)
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/linker
  data.redis.host: localhost
linker:
  storage.type: minio
  queue.type: memory
  scan.type: clamav

---
# application-onprem.yml — 내부 서버 운영
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:5432/linker
  data.redis.host: ${REDIS_HOST}
linker:
  storage.type: minio
  queue.type: memory
  scan.type: clamav

---
# application-cloud.yml — AWS 클라우드 전환 후
spring:
  datasource:
    url: jdbc:postgresql://${RDS_ENDPOINT}:5432/linker
  data.redis.host: ${ELASTICACHE_ENDPOINT}
linker:
  storage.type: s3
  queue.type: sqs
  scan.type: lambda
```

#### 핵심 추상화 인터페이스

```java
/**
 * 파일 저장소 추상화 — On-Prem: MinIO / Cloud: S3
 * @rule 그라운드룰 Rule 2: 하드코딩 금지 (구현체는 Profile로 주입)
 */
public interface FileStorageService {
    /** 업로드용 Pre-signed URL 발급 (유효 5분) */
    String generateUploadUrl(String key, Duration expiry);
    /** 다운로드용 Pre-signed URL 발급 (유효 15분) */
    String generateDownloadUrl(String key, Duration expiry);
    void delete(String key);
}

/**
 * 비동기 AI 작업 큐 추상화 — On-Prem: BlockingQueue / Cloud: SQS
 */
public interface AsyncJobQueue {
    void publish(AiJob job);
}

/**
 * 바이러스 스캔 추상화 — On-Prem: ClamAV / Cloud: Lambda
 */
public interface VirusScanService {
    ScanResult scan(InputStream fileStream, String filename);
}

/**
 * 암호화 키 제공자 추상화 — On-Prem: 환경 변수 / Cloud: AWS KMS
 */
public interface EncryptionKeyProvider {
    SecretKey getAesKey(String keyAlias);
}
```

### 2.5 모니터링 스택

| 항목 | 기술 | 용도 |
|------|------|------|
| 메트릭 수집 | Spring Actuator + Micrometer | JVM·API 지연·DB 커넥션 지표 |
| 저장·집계 | Prometheus | 시계열 메트릭 저장 |
| 시각화 | Grafana | 대시보드·알림 |
| 로그 | AWS CloudWatch Logs | 운영 로그 중앙화 |

---

## 3. AI 챗 어시스턴트 아키텍처

### 3.1 개요

단순 Q&A 봇이 아닌, **Linker 시스템 내 데이터에 직접 접근**하여 업무를 처리하는 **에이전트형 챗봇**.  
LangChain4j의 **Tool Calling** + **RAG** 조합으로 구현.

```
[사용자 입력] "React 경험 있고 가용한 개발자 추천해줘"
      │
      ▼
[AI Chat Engine - LangChain4j]
  1. 의도 파악 (Intent Classification)
  2. Tool 선택 → searchTalents(skills=["React"], available=true)
  3. pgvector 유사도 검색 실행
  4. 결과 자연어 응답 생성 (스트리밍)
      │
      ▼
[클라이언트] "현재 가용한 React 개발자 3명을 찾았어요.
             1. 홍길동 (스코어 87점, React 5년)
             2. ..."
```

### 3.2 Tool 목록 (Function Calling)

| Tool 명 | 설명 | 호출 권한 |
|---------|------|-----------|
| `searchTalents` | 기술·가용 상태·예산 기반 인력 검색 | PM, Admin |
| `getMyProfile` | 내 프로필·스코어 조회 | Talent |
| `updateAvailability` | 가용 상태 변경 | Talent |
| `getProjectList` | 진행 중·공개 프로젝트 목록 조회 | All |
| `getContractDetail` | 내 계약 상세 조회 | Talent, PM |
| `getSettlementStatus` | 정산 현황 및 지급 예정일 조회 | Talent, Procurement |
| `submitWorkReport` | 주간 업무 보고 초안 작성·제출 | Talent |
| `getMyNotifications` | 읽지 않은 알림 요약 조회 | All |
| `generateInterviewGuide` | 후보자 기반 인터뷰 질문 생성 | PM |
| `compareCandiates` | 후보자 비교 리포트 생성 | PM |

### 3.3 대화 컨텍스트 관리

```
Redis Key: chat:session:{userId}:{sessionId}
TTL: 30분 (마지막 메시지 기준 갱신)

저장 구조:
{
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "toolCallHistory": [...],
  "userRole": "PM",
  "activeProjectId": "uuid"   // 대화 중 컨텍스트 유지
}
```

- 최근 **20턴** 유지 (토큰 비용 제어)
- 세션 만료 시 요약본(`summary`) 생성 후 DB 영구 저장 (`chat_histories` 테이블)

### 3.4 응답 스트리밍

```
[백엔드] LLM 토큰 스트리밍 수신
    → WebSocket / SSE로 클라이언트에 청크 전송
    → 프론트엔드: 타이핑 애니메이션 효과로 실시간 렌더링
```

### 3.5 신규 테이블: chat_histories

```sql
CREATE TABLE chat_histories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id),
    session_id  VARCHAR(100) NOT NULL,
    summary     TEXT,                   -- 세션 만료 시 AI 요약본
    messages    JSONB,                  -- 전체 대화 이력
    started_at  TIMESTAMP WITH TIME ZONE,
    ended_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_user ON chat_histories (user_id, ended_at DESC);
```

---

## 4. 비동기 AI 파이프라인 설계

AI 관련 작업(이력서 파싱·임베딩·스코어 재계산)은 LLM API 호출이 포함되어 수 초~수십 초 소요.  
동기 처리 시 API 타임아웃·UX 저하 발생 → **이벤트 드리븐 비동기 구조** 적용

```
[클라이언트]
    │ POST /api/v1/talents/resume
    │
[API Server] ─────────────────────────────────────────────
    │ 1. S3에 파일 저장
    │ 2. talent_profiles 임시 레코드 생성 (status: PROCESSING)
    │ 3. SQS에 작업 메시지 발행
    │ 4. 즉시 202 Accepted 응답 (jobId 포함)
    │
[SQS Queue]
    │
[AI Worker - Spring @Async / Virtual Thread]
    │ 5. LangChain4j → LLM API 호출 (PDF 파싱)
    │ 6. Embedding API 호출 → profile_embedding 생성
    │ 7. F-1.5 날짜 겹침·모순 분석
    │ 8. F-1.3 초기 스코어 산출
    │ 9. talent_profiles 업데이트 (status: COMPLETED)
    │ 10. notifications 테이블 INSERT (in_app 알림)
    │
[SSE / WebSocket]
    └── 클라이언트에 완료 푸시 → 프로필 확인 화면으로 전환
```

**실패 처리**
- SQS 메시지 최대 재시도 3회 → DLQ(Dead Letter Queue)로 이동
- DLQ 모니터링 → CloudWatch 알림 발생 → 운영팀 수동 처리

---

## 4. 파일 보안 설계

```
[업로드 흐름]
클라이언트 ──POST /api/v1/upload/presigned──▶ API Server
                                              │ S3 Pre-signed URL 생성 (유효 5분)
클라이언트 ◀── Pre-signed URL 반환 ──────────┘
클라이언트 ──PUT (직접 S3 업로드)──▶ S3
                                    │ S3 Event 발생
                                    ▼
                              AWS Lambda (바이러스 스캔)
                                    │ 통과 시 → DB 파일 경로 기록
                                    │ 실패 시 → 파일 삭제 + 알림

[다운로드 흐름]
클라이언트 ──GET /api/v1/contracts/{id}/file──▶ API Server
                                               │ 권한 체크 (RBAC)
                                               │ S3 Pre-signed URL 생성 (유효 15분)
클라이언트 ◀── 임시 URL 반환 ─────────────────┘
클라이언트 ──GET (S3 직접 다운로드)──▶ S3
```

---

## 5. 주요 기술 선택 근거

### pgvector
- PostgreSQL 확장 모듈로 별도 Vector DB 운영 오버헤드 없음
- HNSW 인덱스로 고속 ANN(Approximate Nearest Neighbor) 검색
- JSONB와 동일한 테이블에서 벡터+관계형 쿼리 동시 수행 가능

### Java 21 Virtual Thread
- 대규모 정산 연산·AI 결과 대기 시 스레드 블로킹 없이 높은 동시성 확보
- `spring.threads.virtual.enabled=true` 설정으로 적용

### LangChain4j
- Java 생태계에서 LLM 프롬프트 체이닝, RAG 파이프라인 구현
- Spring AI와 병행하여 임베딩·스트리밍·도구 호출 처리

### AWS SQS
- AI 작업 발행-소비 분리 → API 서버와 AI Worker 독립 스케일링 가능
- 메시지 재시도·DLQ 기본 지원으로 작업 유실 방지

---

## 6. 보안 설계

### 6.1 인증 및 접근 제어

| 항목 | 방안 |
|------|------|
| 인증 | Spring Security + JWT (Access 15분 / Refresh 7일) |
| 실명인증 | NICE평가정보 또는 KCB 본인확인 API — 가입 시 **필수** (이름 + 휴대폰 OTP) |
| 2단계 인증 (2FA) | TOTP (Google Authenticator / Authy) 또는 SMS OTP — 가입 완료 조건 |
| 2FA 강제화 | TOTP 설정 미완료 계정은 로그인 후 2FA 설정 화면으로 강제 리디렉션 |
| 인가 | RBAC (Role: TALENT / PM / PROCUREMENT / ADMIN) + 엔티티 소유자 검증 |
| 세션 관리 | Redis에 Refresh Token 저장, 로그아웃 시 즉시 무효화 (블랙리스트) |
| 계정 잠금 | 로그인 5회 연속 실패 → 30분 잠금, 관리자 알림 발송 |

### 6.2 개인정보 보호

| 항목 | 방안 |
|------|------|
| 컬럼 암호화 | 이메일·연락처·실명·주민등록번호 뒷자리·계약 금액 → **AES-256-GCM** (AWS KMS 관리 키) |
| 암호화 검색 | `email_hash` / `phone_hash` SHA-256 컬럼 병행 — 암호화 필드 중복 체크용 |
| CI/DI 저장 | 실명인증 연계정보(CI)·중복가입확인정보(DI) AES-256 암호화 후 별도 테이블 저장 |
| 키 관리 | **AWS KMS** — 암호화 키 자동 로테이션 (90일), 키 접근 CloudTrail 기록 |
| 전송 보안 | HTTPS (TLS 1.3), HSTS, Secure·HttpOnly·SameSite=Strict 쿠키 속성 |
| 데이터 최소화 | 불필요한 개인정보 수집 금지, 목적 외 사용 금지 (개인정보보호법 준수) |
| 보존 기한 | 탈퇴·계약 종료 후 5년 보존 → 자동 파기 스케줄러 (Batch Job) |
| Soft Delete | `deleted_at` 타임스탬프 — 즉시 삭제 대신 보존 기한 관리 |

### 6.3 네트워크 및 인프라 보안

| 항목 | 방안 |
|------|------|
| WAF | **AWS WAF v2** — OWASP Top 10 규칙셋, SQL Injection / XSS 차단 |
| DDoS 방어 | **AWS Shield Standard** (기본) / 고위험 구간 Shield Advanced 검토 |
| 네트워크 격리 | **AWS VPC** — Public(ALB) / Private(App/DB) 서브넷 분리, Security Group 최소 개방 |
| Rate Limiting | Spring Rate Limiter (Redis 기반) — API별 임계치 설정 (로그인: 10req/min/IP) |
| API 보안 헤더 | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy 전체 적용 |
| CSRF 방지 | SPA 구조상 JWT Bearer 토큰 사용 → CSRF 위협 제거, CORS 화이트리스트 관리 |

### 6.4 파일 및 데이터 보안

| 항목 | 방안 |
|------|------|
| 파일 업로드 | S3 Pre-signed URL (유효 5분) + Lambda 바이러스 스캔 통과 후 DB 기록 |
| 파일 다운로드 | S3 Pre-signed URL (유효 15분), RBAC 체크 후 발급 (직접 S3 URL 노출 금지) |
| S3 버킷 정책 | 퍼블릭 액세스 완전 차단, 서버 사이드 암호화 (SSE-KMS) |
| DB 백업 암호화 | RDS 자동 백업 + 스냅샷 KMS 암호화 |

### 6.5 감사 및 모니터링

| 항목 | 방안 |
|------|------|
| 행위 추적 | 계약 서명·정산 승인·스코어 변경·개인정보 조회 → `audit_logs` 기록 (before/after JSONB) |
| 개인정보 접근 로그 | 민감 컬럼(이메일·연락처·실명) 조회 시 별도 접근 로그 기록 |
| 침해 감지 | CloudWatch Alarms — 비정상 로그인 급증·대량 개인정보 조회 자동 알림 |
| 취약점 스캔 | AWS Inspector — EKS 컨테이너 이미지 주기적 취약점 스캔 |

---

## 7. 개발 그라운드룰 연계 도구

> 상세 기준은 `00_ground_rules.md` 참조. 아래는 각 규칙을 지원하는 기술 도구 목록이다.

### Rule 1 — 타임스탬프 로그 도구

| 도구 | 용도 |
|------|------|
| SLF4J + Logback | 백엔드 로깅 프레임워크 (JSON 포맷 출력) |
| Spring AOP (`@Around`) | `@Transactional` 메서드 자동 로그 (시작·종료·소요시간) |
| AWS CloudWatch Logs | 로그 중앙 수집 — 운영 1년 / 감사 5년 보존 |
| Micrometer Tracing | 분산 트레이싱 (`traceId` 자동 삽입) |
| Axios Interceptors | 프론트엔드 API 요청·응답 타임스탬프 로그 |

### Rule 2 — 하드코딩 금지 도구

| 도구 | 용도 |
|------|------|
| Spring `@ConfigurationProperties` | 설정값 타입 안전 바인딩 |
| AWS Secrets Manager | DB 비밀번호·API 키·JWT Secret 런타임 주입 |
| AWS Systems Manager Parameter Store | 환경별 설정값 관리 |
| Vite 환경변수 (`import.meta.env`) | 프론트엔드 환경별 설정 분리 |
| Expo Constants (`app.config.js extra`) | 모바일 환경 설정 주입 |

### Rule 3 — 주석 도구

| 도구 | 용도 |
|------|------|
| JavaDoc | 백엔드 클래스·메서드 문서화 |
| TSDoc (`/** */`) | 프론트엔드·모바일 TypeScript 문서화 |
| SpringDoc OpenAPI 3 (Swagger) | API 명세 자동 생성 (`@Operation`, `@Schema` 어노테이션) |
| Checkstyle | JavaDoc 누락 시 빌드 경고 |

### Rule 4 — 버전 관리 도구

| 도구 | 용도 |
|------|------|
| Git + GitHub | 소스 버전 관리, PR·브랜치 보호 규칙 |
| Flyway | DB 마이그레이션 버전 관리 (수정 금지, 순번 관리) |
| Conventional Commits + commitlint | 커밋 메시지 형식 강제 (CI 훅) |
| GitHub Actions | PR CI — 빌드·테스트·Checkstyle·시크릿 스캔 |
| GitLeaks | 커밋에 시크릿 값 포함 여부 자동 감지 |
| Terraform | AWS 인프라 IaC 버전 관리 |

---

## 8. API 버전 관리 정책

| 항목 | 정책 |
|------|------|
| 기본 경로 | `/api/v1/` |
| 버전 업 조건 | Breaking change (필드 삭제·타입 변경·엔드포인트 제거) |
| Deprecation | 신버전 출시 후 구버전 최소 **6개월** 유지, `Deprecation` 응답 헤더 포함 |
| 하위 호환 변경 | 필드 추가·선택 파라미터 추가는 버전 업 없이 적용 |
| 문서화 | Swagger (SpringDoc OpenAPI 3) 자동 생성, 버전별 분리 |
