# Linker - 개발 그라운드룰

> 본 문서는 Linker 프로젝트 전 참여자가 반드시 준수해야 할 개발 기준이다.  
> 코드 리뷰·PR 병합·배포 전 아래 기준의 준수 여부를 확인한다.

---

## Rule 1. 모든 트랜잭션에 타임스탬프 로그를 남긴다

### 1.1 원칙

- DB 트랜잭션, 외부 API 호출, 비동기 작업 등 **모든 상태 변경 행위**에 타임스탬프가 포함된 로그를 남긴다.
- 로그는 **시작 시각·종료 시각·소요 시간(ms)·성공 여부·행위자·대상 엔티티**를 포함한다.
- 실패 트랜잭션은 오류 코드와 스택 트레이스를 함께 기록한다.

### 1.2 로그 포맷 (JSON — CloudWatch 수집 기준)

```json
{
  "timestamp": "2026-04-18T09:32:01.123Z",
  "level": "INFO",
  "traceId": "abc123def456",
  "userId": "uuid-...",
  "action": "CONTRACT_SIGN",
  "targetType": "contracts",
  "targetId": "uuid-...",
  "durationMs": 142,
  "status": "SUCCESS",
  "message": "계약 서명 완료"
}
```

### 1.3 백엔드 구현 기준 (Spring Boot)

```java
/**
 * 트랜잭션 로깅 AOP — 모든 @Transactional 메서드에 자동 적용
 *
 * @rule 그라운드룰 Rule 1: 타임스탬프 포함 트랜잭션 로그
 */
@Aspect
@Component
public class TransactionLoggingAspect {

    /**
     * @Transactional 어노테이션이 붙은 모든 메서드를 대상으로
     * 시작·종료 시각, 소요 시간, 성공/실패 여부를 JSON 로그로 기록한다.
     *
     * @param joinPoint 실행 대상 메서드 정보
     * @return 원본 메서드 반환값
     * @throws Throwable 원본 예외를 그대로 전파 (로그 기록 후 재던짐)
     */
    @Around("@annotation(org.springframework.transaction.annotation.Transactional)")
    public Object logTransaction(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        String method = joinPoint.getSignature().toShortString();
        log.info("[TX_START] method={} timestamp={}", method, Instant.now());
        try {
            Object result = joinPoint.proceed();
            log.info("[TX_SUCCESS] method={} durationMs={}", method, System.currentTimeMillis() - start);
            return result;
        } catch (Throwable e) {
            log.error("[TX_FAIL] method={} durationMs={} error={}",
                method, System.currentTimeMillis() - start, e.getMessage(), e);
            throw e;
        }
    }
}
```

**로그 레벨 기준**

| 상황 | 레벨 |
|------|------|
| 트랜잭션 시작·성공 | `INFO` |
| 외부 API 호출 (LLM·NICE·ERP) | `INFO` (시작) + `INFO` (완료) |
| 트랜잭션 실패·예외 | `ERROR` |
| 느린 쿼리 (100ms 초과) | `WARN` |
| AI 작업 비동기 상태 변경 | `INFO` |

**로그 보존 기간**: CloudWatch Logs — 운영 로그 1년, 감사 로그 5년 (audit_logs 테이블과 별도)

### 1.4 프론트엔드 로그 기준 (React)

```typescript
/**
 * API 요청/응답 인터셉터 — 모든 Axios 요청에 타임스탬프 로그 자동 적용
 *
 * @rule 그라운드룰 Rule 1: 타임스탬프 포함 트랜잭션 로그
 */
axiosInstance.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  console.info(`[REQ] ${config.method?.toUpperCase()} ${config.url}`, {
    timestamp: new Date().toISOString(),
  });
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    const durationMs = Date.now() - response.config.metadata.startTime;
    console.info(`[RES] ${response.status} ${response.config.url} ${durationMs}ms`);
    return response;
  },
  (error) => {
    console.error(`[RES_ERR] ${error.response?.status} ${error.config?.url}`, error);
    return Promise.reject(error);
  }
);
```

---

## Rule 2. 하드코딩은 없다

### 2.1 원칙

- 서버 주소, 포트, 비밀키, API 키, 타임아웃 값, 매직 넘버 등 **변경 가능성이 있는 모든 값**은 코드에 직접 작성하지 않는다.
- 환경별로 달라지는 값은 환경 변수 또는 설정 파일로 분리한다.
- 민감 정보(API Key, DB 비밀번호, JWT Secret)는 **AWS Secrets Manager / Parameter Store**에서 런타임 주입한다.

### 2.2 백엔드 (Spring Boot)

```yaml
# application.yml — 모든 설정값은 여기서 관리. 코드 내 직접 값 작성 금지.
linker:
  jwt:
    secret: ${JWT_SECRET}              # AWS Parameter Store 주입
    access-token-expiry: 900           # 초 단위 (15분)
    refresh-token-expiry: 604800       # 초 단위 (7일)
  mfa:
    totp-issuer: "Linker"
    otp-expiry-seconds: 300
  rate-limit:
    login-max-attempts: 5
    login-lock-minutes: 30
  file:
    presigned-upload-expiry-seconds: 300
    presigned-download-expiry-seconds: 900
  ai:
    sqs-queue-url: ${AI_SQS_QUEUE_URL}
    llm-model: ${LLM_MODEL_NAME}
  nice:
    api-url: ${NICE_API_URL}
    client-id: ${NICE_CLIENT_ID}
    client-secret: ${NICE_CLIENT_SECRET}
```

```java
/**
 * JWT 설정 프로퍼티 — application.yml의 linker.jwt 섹션을 바인딩한다.
 * 하드코딩 금지 원칙에 따라 모든 JWT 관련 상수는 이 클래스를 통해 주입받는다.
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
@ConfigurationProperties(prefix = "linker.jwt")
@Validated
public record JwtProperties(
    @NotBlank String secret,
    @Positive int accessTokenExpiry,
    @Positive int refreshTokenExpiry
) {}
```

**Enum 활용 — 매직 스트링 금지**

```java
/**
 * 사용자 역할 Enum — 역할 문자열을 코드 내 직접 사용 금지.
 * 반드시 이 Enum을 통해 참조한다.
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
public enum UserRole {
    TALENT, PM, PROCUREMENT, ADMIN
}

/**
 * 트랜잭션 액션 Enum — audit_logs.action 컬럼 값을 중앙 관리한다.
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
public enum AuditAction {
    CONTRACT_SIGN, CONTRACT_TERMINATE,
    SETTLEMENT_APPROVE, SCORE_UPDATE,
    PERSONAL_DATA_ACCESS, ACCOUNT_LOCK,
    MFA_SETUP, IDENTITY_VERIFY
}
```

### 2.3 프론트엔드 (React + Vite)

```
# .env.development
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/ws
VITE_NICE_POPUP_URL=https://nice.checkplus.co.kr/...

# .env.production
VITE_API_BASE_URL=https://api.linker.co.kr/api/v1
VITE_WS_URL=wss://api.linker.co.kr/ws
```

```typescript
/**
 * 애플리케이션 전역 상수 — 매직 넘버·문자열 사용 금지.
 * 변경 빈도가 낮은 UI 상수는 이 파일에서 중앙 관리한다.
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
export const APP_CONSTANTS = {
  SCORE: {
    HIGH_THRESHOLD: 80,    // 80점 이상 → success 색상
    MID_THRESHOLD: 60,     // 60~79점 → warning 색상
  },
  TOAST_DURATION_MS: 2000,
  POLLING_INTERVAL_MS: 3000,   // AI 처리 상태 폴링 주기
  MAX_FILE_SIZE_MB: 20,
} as const;
```

### 2.3 인프라 추상화 — 환경별 구현체는 Profile로 주입

```java
// 구현체를 직접 참조하지 않는다. 반드시 인터페이스를 주입받아 사용한다.
// On-Prem: MinioFileStorageService / Cloud: S3FileStorageService
@Service
public class ResumeService {

    private final FileStorageService fileStorage;   // 구현체 모름, 인터페이스만 의존
    private final VirusScanService virusScan;
    private final AsyncJobQueue jobQueue;
    ...
}
```

### 2.4 모바일 (React Native)

```typescript
// src/config/env.ts
/**
 * 모바일 환경 설정 — Expo Constants를 통해 빌드 시 주입된 값을 읽는다.
 * app.config.js의 extra 섹션에서 환경 변수를 매핑하여 사용한다.
 *
 * @rule 그라운드룰 Rule 2: 하드코딩 금지
 */
export const ENV = {
  API_BASE_URL: Constants.expoConfig?.extra?.apiBaseUrl,
  WS_URL: Constants.expoConfig?.extra?.wsUrl,
} as const;
```

---

## Rule 3. 모든 소스에는 상세한 주석을 남긴다

### 3.1 원칙

- **클래스·인터페이스**: 역할, 관련 기능 ID, 주요 제약 사항을 기술한다.
- **퍼블릭 메서드**: `@param`, `@return`, `@throws`를 모두 작성한다.
- **복잡한 비즈니스 로직**: 왜(Why) 이렇게 구현했는지 인라인 주석으로 설명한다.
- **도메인 규칙**: 기획서 기능 ID(F-1.3 등)를 `@feature` 태그로 명시한다.
- **보안·암호화 코드**: 알고리즘 선택 이유와 주의사항을 반드시 기술한다.

### 3.2 백엔드 JavaDoc 표준

```java
/**
 * AI 다차원 스코어링 서비스
 *
 * <p>Talent의 기술 숙련도·신뢰도·수행 실적·보너스를 종합하여 0~100점 역량 점수를 산출한다.
 * 산출된 점수는 매칭 쿼리의 우선순위 기준으로 사용된다.
 *
 * @feature F-1.3 AI 다차원 스코어링
 * @see TalentProfileRepository
 * @see ScoreHistoryRepository
 */
@Service
@Slf4j
public class TalentScoringService {

    /**
     * 전체 스코어를 재계산하고 변동이 있을 경우 score_history에 기록한다.
     *
     * <p>스코어 공식: skill*0.4 + reliability*0.3 + performance*0.3 + bonus(상한 10점)
     * bonus_score는 DB CHECK 제약으로 0~10 범위가 보장되지만,
     * 서비스 레이어에서도 이중 검증하여 total_score가 110을 초과하지 않도록 한다.
     *
     * @param talentId  스코어를 재계산할 Talent의 UUID
     * @param reason    스코어 변동 사유 (score_history.reason에 기록됨)
     * @return          재계산된 TalentScoreResult (이전 점수·현재 점수 포함)
     * @throws TalentNotFoundException  해당 talentId의 프로필이 존재하지 않을 경우
     * @rule            그라운드룰 Rule 1: 스코어 변동 시 타임스탬프 포함 로그 기록
     * @rule            그라운드룰 Rule 3: 상세 주석 필수
     */
    @Transactional
    public TalentScoreResult recalculateScore(UUID talentId, String reason) { ... }
}
```

### 3.3 프론트엔드 JSDoc / TSDoc 표준

```typescript
/**
 * Talent 프로필 카드 컴포넌트
 *
 * AI 스코어 바(Horizontal Progress Bar)와 가용 상태를 Glanceable 형태로 표시한다.
 * 스코어 범위에 따라 색상이 자동 적용된다:
 *   - 80점 이상: success(#166534)
 *   - 60~79점:  warning(#D97706)
 *   - 60점 미만: danger(#991B1B)
 *
 * @feature F-2.2 AI 인력 추천 결과 카드
 * @see {@link ScoreBar} 스코어 시각화 서브 컴포넌트
 * @rule 그라운드룰 Rule 3: 상세 주석 필수
 *
 * @param talent - 표시할 Talent 데이터 (TalentSummary 타입)
 * @param onProposalSend - 제안 발송 버튼 클릭 핸들러
 */
export function TalentCard({ talent, onProposalSend }: TalentCardProps) { ... }
```

### 3.4 SQL 주석 표준 (Flyway 마이그레이션)

```sql
-- ============================================================
-- V3__add_identity_verifications.sql
-- 목적  : 가입 시 실명인증(NICE/KCB) 결과를 저장하는 테이블 생성
-- 관련  : 그라운드룰 Rule 2(하드코딩 금지), 09_security_policy.md §1.1
-- 작성일: 2026-04-18
-- ============================================================

CREATE TABLE identity_verifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- CI: 연계정보 — 서비스 간 동일인 확인에 사용. AES-256-GCM 암호화 필수.
    ci          TEXT,
    -- DI: 중복가입확인정보 — 동일인의 이중 가입 차단에 사용. di_hash로 중복 검색.
    di          TEXT,
    di_hash     VARCHAR(64),   -- SHA-256 해시 (평문 검색 불가 대신 중복 체크용)
    ...
);
```

---

## Rule 4. 모든 소스는 버전 관리를 한다

### 4.1 원칙

- `.env` 파일(실제 값 포함)·시크릿 파일 이외의 **모든 소스·설정·마이그레이션 파일**은 Git으로 관리한다.
- 커밋 없이 배포하지 않는다. **모든 변경은 반드시 커밋 이력이 존재해야 한다.**
- DB 스키마 변경은 반드시 **Flyway 마이그레이션 파일**로 작성하고 버전 관리한다.
- 설정값(시크릿 제외)은 `.env.example` / `application-template.yml` 형태로 커밋하여 팀 공유한다.

### 4.2 브랜치 전략 (GitHub Flow 기반)

```
main           — 배포 가능한 상태만 유지 (직접 커밋 금지)
  └── develop  — 통합 테스트 브랜치
        ├── feature/{기능명}   — 신기능 개발 (예: feature/2fa-setup)
        ├── fix/{이슈번호}     — 버그 수정 (예: fix/1234-token-expiry)
        └── hotfix/{이슈번호}  — 프로덕션 긴급 수정
```

**브랜치 보호 규칙 (GitHub Branch Protection)**

| 브랜치 | 규칙 |
|--------|------|
| `main` | PR 필수, 리뷰어 2인 승인, CI 통과 필수, 직접 push 금지 |
| `develop` | PR 필수, 리뷰어 1인 승인, CI 통과 필수 |

### 4.3 커밋 메시지 컨벤션 (Conventional Commits)

```
<type>(<scope>): <제목> [#이슈번호]

[본문 — 선택사항]

[꼬리말 — 선택사항]
```

| type | 사용 기준 |
|------|-----------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `security` | 보안 취약점 수정, 암호화 변경 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `test` | 테스트 추가·수정 |
| `docs` | 문서·주석 변경 |
| `chore` | 빌드 설정, 의존성 업데이트 |
| `db` | Flyway 마이그레이션 추가·수정 |

```bash
# 예시
feat(auth): NICE 실명인증 연동 및 2FA TOTP 설정 구현 #42

- NICE API 팝업 연동 후 CI/DI AES-256-GCM 암호화 저장
- TOTP 시드 발급·검증 로직 구현 (Google Authenticator 호환)
- 2FA 미설정 계정 로그인 차단 Spring Security 필터 추가

Closes #42
```

### 4.4 DB 버전 관리 (Flyway)

```
db/migration/
├── V1__init_schema.sql              # 초기 스키마 (users, talent_profiles 등)
├── V2__add_partner_companies.sql    # partner_companies 테이블
├── V3__add_identity_verifications.sql  # 실명인증 테이블
├── V4__add_mfa_fields_to_users.sql  # users 2FA 필드 추가
└── V5__add_hnsw_indexes.sql         # pgvector HNSW 인덱스
```

- 마이그레이션 파일은 **수정 금지** — 잘못 작성한 경우 새 버전(V_N+1)으로 수정 파일 작성
- 파일명은 순번·설명·날짜 포함: `V{n}__{설명}.sql`
- 각 파일 상단에 목적·관련 이슈·작성자·날짜 주석 필수 (Rule 3 준수)

### 4.5 시맨틱 버저닝 (API)

| 버전 업 기준 | 예시 |
|-------------|------|
| **MAJOR** (Breaking Change) | 필드 제거·타입 변경·엔드포인트 삭제 |
| **MINOR** (하위 호환 추가) | 새 엔드포인트·응답 필드 추가 |
| **PATCH** (버그 수정) | 동작 오류 수정, 로직 보정 |

현재 버전: `v1.0.0` — 경로 prefix `/api/v1/`

### 4.6 버전 관리 대상 목록

| 대상 | 관리 방식 | 비고 |
|------|-----------|------|
| 백엔드 소스 | Git | 전체 커밋 |
| 프론트엔드 소스 | Git | 전체 커밋 |
| DB 마이그레이션 | Git + Flyway | 수정 금지, 신규 버전으로 변경 |
| `application.yml` | Git | 실제 시크릿 값은 `${ENV_VAR}` 형태만 커밋 |
| `.env.example` | Git | 키 목록만 공유, 실제 값 없음 |
| Docker / K8s 설정 | Git | EKS 배포 매니페스트 포함 |
| Terraform / IaC | Git | AWS 인프라 코드 |
| 설계 문서 (`*.md`) | Git | 이 문서 포함 |
| `.env` (실제 값) | **Git 제외** | `.gitignore` 필수 등록 |
| AWS Secrets | AWS Secrets Manager | Git에 절대 커밋 금지 |

---

## Rule 5. 기능이 다르면 소스를 분리한다

### 5.1 원칙

- **단일 책임 원칙(SRP)**: 하나의 파일·클래스·컴포넌트는 하나의 책임만 가진다.
- **관심사 분리(SoC)**: 도메인 로직·인프라·UI·설정은 각각 독립된 레이어로 분리한다.
- 서로 다른 도메인(예: 인력 관리 / 계약 / 정산)은 같은 파일에 혼재하지 않는다.
- 파일이 300줄을 초과하거나 두 가지 이상의 역할을 수행하면 분리를 검토한다.

### 5.2 백엔드 패키지 구조 — 도메인별 분리

```
src/main/java/kr/co/linker/
├── auth/                          # 인증·인가 전용 도메인
│   ├── controller/AuthController.java
│   ├── service/AuthService.java
│   ├── service/MfaService.java    # 2FA 로직만 담당
│   ├── service/IdentityVerificationService.java  # 실명인증만 담당
│   ├── dto/
│   └── repository/
│
├── talent/                        # 인력 관리 도메인
│   ├── controller/TalentController.java
│   ├── service/TalentProfileService.java
│   ├── service/TalentScoringService.java   # 스코어 계산만 담당
│   └── repository/
│
├── contract/                      # 계약·구매 도메인
├── settlement/                    # 정산 도메인
├── notification/                  # 알림 전용 (이메일·SMS·푸시)
│
└── common/                        # 공통 인프라·유틸
    ├── aop/TransactionLoggingAspect.java
    ├── encryption/EncryptionService.java
    ├── storage/FileStorageService.java     # 인터페이스
    ├── queue/AsyncJobQueue.java            # 인터페이스
    └── exception/GlobalExceptionHandler.java
```

**잘못된 예 — 혼재 금지**

```java
// ❌ 금지: 계약 서비스 안에 정산 로직 혼재
@Service
public class ContractService {
    public void signContract(...) { ... }
    public void calculateSettlement(...) { ... }  // 정산은 SettlementService로 분리
}

// ✅ 올바른 예: 책임별 분리
@Service public class ContractService   { public void signContract(...)      { ... } }
@Service public class SettlementService { public void calculateSettlement(...) { ... } }
```

### 5.3 프론트엔드 파일 구조 — 기능별 분리

```
src/
├── features/                      # 기능 단위 폴더 (도메인별 격리)
│   ├── auth/
│   │   ├── components/LoginForm.tsx
│   │   ├── components/MfaSetupModal.tsx   # 2FA 설정만 담당
│   │   ├── hooks/useAuth.ts
│   │   └── api/authApi.ts
│   │
│   ├── talent/
│   │   ├── components/TalentCard.tsx
│   │   ├── components/ScoreBar.tsx        # 점수 표시만 담당
│   │   ├── hooks/useTalentSearch.ts
│   │   └── api/talentApi.ts
│   │
│   ├── contract/
│   └── settlement/
│
├── shared/                        # 도메인 무관 공통 요소
│   ├── components/Button.tsx
│   ├── hooks/useToast.ts
│   └── utils/formatDate.ts
│
└── pages/                         # 라우팅 진입점만 — 비즈니스 로직 금지
    ├── TalentListPage.tsx
    └── ContractDetailPage.tsx
```

**잘못된 예 — 혼재 금지**

```typescript
// ❌ 금지: 컴포넌트 안에 API 호출·상태 관리·UI 혼재
export function TalentListPage() {
  const [talents, setTalents] = useState([]);
  useEffect(() => { axios.get('/api/v1/talents').then(...) }, []);   // API는 api/ 파일로
  return <div>...</div>;
}

// ✅ 올바른 예: 관심사 분리
// api/talentApi.ts → API 호출
// hooks/useTalentSearch.ts → 상태·쿼리 관리
// components/TalentCard.tsx → 순수 UI 렌더링
// pages/TalentListPage.tsx → 조합만 담당
```

### 5.4 분리 기준 요약

| 분리 기준 | 백엔드 | 프론트엔드 |
|-----------|--------|-----------|
| 도메인 경계 | 패키지 분리 (`auth/`, `talent/`, `contract/`) | `features/` 폴더 분리 |
| 레이어 경계 | Controller / Service / Repository 분리 | Page / Component / Hook / API 분리 |
| 공통 인프라 | `common/` 패키지 | `shared/` 폴더 |
| 파일 크기 기준 | 클래스 300줄 초과 → 분리 검토 | 컴포넌트 200줄 초과 → 분리 검토 |
| 책임 수 기준 | 메서드가 2개 이상의 도메인을 변경하면 분리 | Hook이 2개 이상의 API를 직접 호출하면 분리 |

---

## 6. 코드 리뷰 체크리스트

PR 병합 전 리뷰어는 아래 항목을 확인한다.

| # | 항목 | 관련 Rule |
|---|------|-----------|
| 1 | 모든 @Transactional 메서드에 로그가 추가되었는가? | Rule 1 |
| 2 | 새로 추가된 외부 API 호출에 시작·종료 타임스탬프 로그가 있는가? | Rule 1 |
| 3 | 코드 내 문자열·숫자 리터럴이 하드코딩되지 않았는가? | Rule 2 |
| 4 | 새로운 설정값이 `application.yml` 또는 `.env`로 분리되었는가? | Rule 2 |
| 5 | 민감 값이 AWS Secrets Manager를 통해 주입되고 있는가? | Rule 2 |
| 6 | 모든 퍼블릭 클래스·메서드에 JavaDoc/JSDoc이 작성되었는가? | Rule 3 |
| 7 | 복잡한 비즈니스 로직에 Why 주석이 있는가? | Rule 3 |
| 8 | 기능 ID(`@feature F-X.X`)가 관련 코드에 명시되었는가? | Rule 3 |
| 9 | DB 변경이 Flyway 마이그레이션 파일로 작성되었는가? | Rule 4 |
| 10 | 커밋 메시지가 Conventional Commits 형식을 따르는가? | Rule 4 |
| 11 | `.env`·시크릿 파일이 커밋에 포함되지 않았는가? | Rule 4 |
| 12 | 하나의 클래스·컴포넌트가 두 가지 이상의 도메인 책임을 갖지 않는가? | Rule 5 |
| 13 | 새 파일이 적절한 레이어·기능 폴더에 배치되었는가? | Rule 5 |
