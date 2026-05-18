# Linker - 데이터베이스 설계서

> DBMS: PostgreSQL 16+  
> Extensions: `pgvector` (벡터 유사도), `uuid-ossp` (UUID PK)

---

## 1. ERD 요약

```
users (1)──────(1) talent_profiles (1)──────(N) talent_experiences
  │                      │
  │ (PM/Admin)           └──────────────────(N) contracts (N)──────(1) project_opportunities
  │                                                  │
  │                                                  ├──────(N) evaluations
  │                                                  ├──────(N) timesheets
  │                                                  └──────(N) work_reports
  │
partner_companies (1)──────(N) talent_profiles

match_proposals (N)──────(1) project_opportunities
match_proposals (N)──────(1) talent_profiles

notifications (N)──────(1) users
interview_records (N)──────(1) match_proposals
audit_logs ── (독립, 전 엔티티 참조)
score_history (N)──────(1) talent_profiles
verification_logs (N)──────(1) talent_experiences
```

**전체 테이블 목록**

| # | 물리명 | 논리명 | 설명 |
|---|--------|--------|------|
| 1 | **users** | 사용자 계정 | 전체 역할 계정, 2FA 설정, 실명인증 상태 |
| 2 | **identity_verifications** | 실명인증 이력 | 가입 시 NICE/KCB 본인확인 결과 저장 |
| 3 | **partner_companies** | 파트너사 | 외부 인력 소속 파트너사 정보 |
| 4 | talent_profiles | 인력 프로필 마스터 | 기본 정보, AI 스코어, 벡터 |
| 5 | talent_experiences | 인력 이력 상세 | 프로젝트 경험, AI 진위 검증 |
| 6 | project_opportunities | 프로젝트 기회 | 사업 기회, 매칭 요구사항 |
| 7 | contracts | 계약 정보 | 계약·단가 분석 |
| 8 | evaluations | 피드백 및 평가 | PM/동료 피드백, AI 신뢰도 |
| 9 | talent_skills | 보유 기술 | 기술 및 숙련도 |
| 10 | match_proposals | 매칭 제안 | AI 추천 및 제안 현황 |
| 11 | **interview_records** | 인터뷰 기록 | 인터뷰 일정·결과 기록 |
| 12 | timesheets | 타임시트 | 업무 투입 공수 기록 |
| 13 | work_reports | 업무 보고 | 주간 보고, AI 리스크 분석 |
| 14 | verification_logs | 검증 로그 | 이력 진위·실존성 검증 결과 |
| 15 | score_history | 스코어 이력 | AI 스코어 변동 시계열 |
| 16 | **notifications** | 알림 이력 | 발송 알림 이력 및 상태 관리 |
| 17 | **audit_logs** | 감사 로그 | 전 엔티티 주요 행위 추적 |

---

## 2. DDL - 핵심 테이블

### 2.1 users (수정 — 2FA·실명인증 필드 추가)

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id     VARCHAR(255) UNIQUE,                    -- OAuth/SSO 연동 ID (선택)
    email           TEXT NOT NULL,                          -- AES-256-GCM 암호화
    email_hash      VARCHAR(64) UNIQUE NOT NULL,            -- SHA-256 해시 (중복 가입·검색용)
    password_hash   VARCHAR(255),                           -- BCrypt (소셜 로그인 시 NULL)

    -- 실명인증
    real_name       TEXT,                                   -- AES-256-GCM 암호화 (NICE/KCB 인증 실명)
    phone           TEXT,                                   -- AES-256-GCM 암호화
    phone_hash      VARCHAR(64),                            -- SHA-256 해시 (중복 체크용)
    identity_verified      BOOLEAN DEFAULT FALSE,
    identity_verified_at   TIMESTAMP WITH TIME ZONE,

    -- 2단계 인증 (2FA)
    mfa_enabled     BOOLEAN DEFAULT FALSE,
    mfa_type        VARCHAR(10),                            -- TOTP | SMS
    mfa_secret      TEXT,                                   -- TOTP 시드 (AES-256-GCM 암호화)
    mfa_backup_codes JSONB,                                 -- 일회용 백업 코드 해시 배열

    -- 계정 상태
    role            VARCHAR(30) NOT NULL,                   -- TALENT | PM | PROCUREMENT | ADMIN
    department      VARCHAR(100),                           -- 내부 직원 부서
    is_active       BOOLEAN DEFAULT TRUE,
    failed_login_count  INT DEFAULT 0,
    locked_until        TIMESTAMP WITH TIME ZONE,           -- 계정 잠금 만료 시각
    password_changed_at TIMESTAMP WITH TIME ZONE,
    last_login_at   TIMESTAMP WITH TIME ZONE,
    last_login_ip   VARCHAR(45),                            -- 마지막 로그인 IP

    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email_hash ON users (email_hash);
CREATE INDEX idx_users_phone_hash ON users (phone_hash);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_identity_verified ON users (identity_verified) WHERE identity_verified = FALSE;
```

### 2.2 identity_verifications (신규)

```sql
CREATE TABLE identity_verifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    provider        VARCHAR(20) NOT NULL,                   -- NICE | KCB
    ci              TEXT,                                   -- 연계정보 (AES-256-GCM 암호화) — 동일인 확인용
    di              TEXT,                                   -- 중복가입확인정보 (AES-256-GCM 암호화)
    di_hash         VARCHAR(64),                            -- DI SHA-256 해시 — 중복 가입 차단 인덱스용
    verified_name   TEXT,                                   -- 인증된 실명 (AES-256-GCM 암호화)
    verified_phone  TEXT,                                   -- 인증된 휴대폰 (AES-256-GCM 암호화)
    status          VARCHAR(20) DEFAULT 'COMPLETED',        -- PENDING | COMPLETED | FAILED
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),
    verified_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DI 해시 기반 중복 가입 차단
CREATE UNIQUE INDEX idx_identity_di_hash ON identity_verifications (di_hash)
    WHERE status = 'COMPLETED';
CREATE INDEX idx_identity_user ON identity_verifications (user_id);
```

### 2.3 partner_companies (신규)

```sql
CREATE TABLE partner_companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    business_number VARCHAR(20) UNIQUE,                     -- 사업자 등록번호
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(30),
    address         TEXT,
    contract_grade  VARCHAR(20) DEFAULT 'STANDARD',         -- STANDARD | PREFERRED | BLACKLISTED
    is_approved     BOOLEAN DEFAULT FALSE,                  -- 구매부 등록 승인 여부
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 talent_profiles (수정)

```sql
CREATE TABLE talent_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID UNIQUE NOT NULL REFERENCES users(id),  -- users 테이블 FK
    company_id          UUID REFERENCES partner_companies(id),       -- 소속 파트너사 (신규)
    name                VARCHAR(100) NOT NULL,
    email               VARCHAR(255),                               -- AES-256 암호화
    email_hash          VARCHAR(64),                                -- 검색용 SHA-256 해시 (신규)
    phone               VARCHAR(30),                                -- AES-256 암호화
    availability_status VARCHAR(20) DEFAULT 'AVAILABLE',            -- AVAILABLE | BUSY | REST
    available_from      DATE,
    desired_rate        DECIMAL(15,2),                              -- 희망 단가 (매칭 예산 필터용, 신규)
    work_type           VARCHAR(20) DEFAULT 'REMOTE',               -- REMOTE | ONSITE | HYBRID (신규)
    deleted_at          TIMESTAMP WITH TIME ZONE,                   -- Soft Delete (신규)

    -- AI Scoring (F-1.3) — bonus 상한 10점으로 제한
    skill_score         DECIMAL(5,2) DEFAULT 0 CHECK (skill_score BETWEEN 0 AND 100),
    reliability_score   DECIMAL(5,2) DEFAULT 0 CHECK (reliability_score BETWEEN 0 AND 100),
    performance_score   DECIMAL(5,2) DEFAULT 0 CHECK (performance_score BETWEEN 0 AND 100),
    bonus_score         DECIMAL(5,2) DEFAULT 0 CHECK (bonus_score BETWEEN 0 AND 10),  -- 상한 10점
    total_score DECIMAL(5,2) GENERATED ALWAYS AS (
        skill_score * 0.4
        + reliability_score * 0.3
        + performance_score * 0.3
        + bonus_score
    ) STORED,

    -- 콜드 스타트 보정 (신규)
    is_new_talent   BOOLEAN GENERATED ALWAYS AS (performance_score = 0) STORED,

    -- Vector Search (F-1.4)
    profile_embedding   vector(1536),

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_talent_email_hash ON talent_profiles (email_hash);
CREATE INDEX idx_talent_company ON talent_profiles (company_id);
CREATE INDEX idx_talent_work_type ON talent_profiles (work_type, availability_status);
CREATE INDEX idx_talent_desired_rate ON talent_profiles (desired_rate);
```

### 2.5 talent_experiences

```sql
CREATE TABLE talent_experiences (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id           UUID REFERENCES talent_profiles(id) ON DELETE CASCADE,
    company_name        VARCHAR(200),
    project_name        VARCHAR(255) NOT NULL,
    role                VARCHAR(100),
    start_date          DATE NOT NULL,
    end_date            DATE,
    description         TEXT,
    tech_stack          JSONB,                              -- ["Java", "Spring", "React"]

    -- Verification Flags (F-1.5, F-1.8, F-1.9)
    is_verified         BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'UNKNOWN',      -- VERIFIED | SUSPICIOUS | UNKNOWN
    suspicious_points   TEXT,

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.6 project_opportunities (수정)

```sql
CREATE TABLE project_opportunities (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    required_skills         JSONB,                          -- [{"skill":"Java","level":"senior"}]
    budget_min              DECIMAL(15,2),                  -- 예산 범위 분리 (신규, 매칭 필터용)
    budget_max              DECIMAL(15,2),
    start_date              DATE,
    end_date                DATE,
    work_type               VARCHAR(20) DEFAULT 'REMOTE',   -- REMOTE | ONSITE | HYBRID (신규)
    pm_id                   UUID NOT NULL REFERENCES users(id),
    status                  VARCHAR(50) DEFAULT 'OPEN',     -- OPEN | MATCHED | CLOSED | CANCELLED
    requirement_embedding   vector(1536),
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.7 contracts (수정)

```sql
CREATE TABLE contracts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id          UUID REFERENCES project_opportunities(id),
    talent_id           UUID REFERENCES talent_profiles(id),
    procurement_id      UUID REFERENCES users(id),          -- FK 명시 (수정)
    unit_price          DECIMAL(15,2),
    total_amount        DECIMAL(15,2),
    contract_terms      TEXT,
    contract_file_url   VARCHAR(500),                       -- S3 Pre-signed URL 경로 (신규)
    ai_price_analysis   JSONB,
    status              VARCHAR(50) DEFAULT 'DRAFT',        -- DRAFT | SIGNED | EXPIRED | TERMINATED
    signed_at           TIMESTAMP,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.8 evaluations

```sql
CREATE TABLE evaluations (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id             UUID REFERENCES contracts(id),
    evaluator_id            UUID NOT NULL REFERENCES users(id),
    evaluator_role          VARCHAR(20),                    -- PM | PEER
    raw_feedback            TEXT,
    structured_feedback     JSONB,
    trust_score             DECIMAL(5,2),
    system_log_match_rate   DECIMAL(5,2),
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.9 match_proposals (수정)

```sql
CREATE TABLE match_proposals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id          UUID REFERENCES project_opportunities(id),
    talent_id           UUID REFERENCES talent_profiles(id),
    similarity_score    DECIMAL(5,4),
    ai_reason           TEXT,
    interview_guide     TEXT,                               -- F-2.5 인터뷰 가이드 (신규)
    status              VARCHAR(50) DEFAULT 'PENDING',      -- PENDING | ACCEPTED | REJECTED | EXPIRED
    rejected_by_pm      BOOLEAN DEFAULT FALSE,              -- PM 거절 이력 (매칭 하위 노출용, 신규)
    proposed_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at        TIMESTAMP
);
```

### 2.10 interview_records (신규)

```sql
CREATE TABLE interview_records (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id         UUID REFERENCES match_proposals(id),
    interviewer_id      UUID REFERENCES users(id),          -- 면접관 (PM)
    scheduled_at        TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at        TIMESTAMP WITH TIME ZONE,
    interview_type      VARCHAR(30),                        -- VIDEO | PHONE | ONSITE
    result              VARCHAR(20),                        -- PASS | FAIL | PENDING
    notes               TEXT,                               -- 면접 결과 메모
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.11 timesheets

```sql
CREATE TABLE timesheets (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id         UUID REFERENCES contracts(id),
    talent_id           UUID REFERENCES talent_profiles(id),
    work_date           DATE NOT NULL,
    hours_worked        DECIMAL(4,2) NOT NULL,
    work_description    TEXT,
    status              VARCHAR(30) DEFAULT 'SUBMITTED',    -- SUBMITTED | APPROVED | REJECTED
    ai_anomaly_flag     BOOLEAN DEFAULT FALSE,
    approved_by         UUID REFERENCES users(id),          -- 승인자 FK (신규)
    approved_at         TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.12 work_reports

```sql
CREATE TABLE work_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id     UUID REFERENCES contracts(id),
    talent_id       UUID REFERENCES talent_profiles(id),
    report_week     DATE NOT NULL,
    content         TEXT NOT NULL,
    ai_risk_level   VARCHAR(20),                            -- LOW | MEDIUM | HIGH
    ai_risk_summary TEXT,
    sentiment_score DECIMAL(3,2),                           -- -1.00 ~ 1.00
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.13 notifications (신규)

```sql
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id),
    type            VARCHAR(50) NOT NULL,                   -- PROPOSAL | INTERVIEW | CONTRACT | SETTLEMENT | RISK_ALERT
    channel         VARCHAR(20) NOT NULL,                   -- EMAIL | SLACK | IN_APP
    title           VARCHAR(255),
    body            TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    sent_at         TIMESTAMP WITH TIME ZONE,
    status          VARCHAR(20) DEFAULT 'PENDING',          -- PENDING | SENT | FAILED
    retry_count     INT DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_status ON notifications (status, retry_count) WHERE status = 'FAILED';
```

### 2.14 audit_logs (신규)

```sql
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id    UUID NOT NULL REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,                      -- CONTRACT_SIGN | SCORE_UPDATE | SETTLEMENT_APPROVE 등
    target_type VARCHAR(50),                                -- contracts | talent_profiles | timesheets 등
    target_id   UUID,
    before_data JSONB,                                      -- 변경 전 스냅샷
    after_data  JSONB,                                      -- 변경 후 스냅샷
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(255),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_target ON audit_logs (target_type, target_id);
```

### 2.15 score_history

```sql
CREATE TABLE score_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id       UUID REFERENCES talent_profiles(id),
    score_type      VARCHAR(30),                            -- SKILL | RELIABILITY | PERFORMANCE | BONUS
    before_value    DECIMAL(5,2),
    after_value     DECIMAL(5,2),
    reason          TEXT,
    changed_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.16 verification_logs

```sql
CREATE TABLE verification_logs (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id       UUID REFERENCES talent_experiences(id),
    verification_type   VARCHAR(50),                        -- ACADEMIC | CERTIFICATE | PROJECT_EXISTENCE
    source              VARCHAR(100),                       -- 검증 기관/API명
    result              VARCHAR(30),                        -- PASSED | FAILED | MANUAL_REQUIRED
    detail              JSONB,                              -- 검증 상세 결과
    verified_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. 인덱스 전략

```sql
-- 벡터 유사도 검색 (HNSW: 고속 ANN)
CREATE INDEX idx_talent_embedding ON talent_profiles
    USING hnsw (profile_embedding vector_cosine_ops);

CREATE INDEX idx_project_embedding ON project_opportunities
    USING hnsw (requirement_embedding vector_cosine_ops);

-- 이력 실존성 확인
CREATE INDEX idx_experience_project ON talent_experiences (project_name, company_name);

-- 구매부 정산 필터링
CREATE INDEX idx_contracts_status ON contracts (status);

-- 가용 상태 필터링 (매칭 1차 조건)
CREATE INDEX idx_talent_availability ON talent_profiles (availability_status, total_score DESC)
    WHERE deleted_at IS NULL;

-- 신규 인력 콜드스타트 보정 필터
CREATE INDEX idx_talent_new ON talent_profiles (is_new_talent) WHERE is_new_talent = TRUE;

-- 예산 범위 매칭 필터 (신규)
CREATE INDEX idx_project_budget ON project_opportunities (budget_min, budget_max);
CREATE INDEX idx_talent_rate ON talent_profiles (desired_rate);

-- 타임시트 승인 처리
CREATE INDEX idx_timesheet_contract_status ON timesheets (contract_id, status);

-- 감사 로그 조회
CREATE INDEX idx_audit_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_target ON audit_logs (target_type, target_id);
```

---

## 4. 데이터 무결성 및 보안

| 항목 | 방안 |
|------|------|
| 실명인증 중복 방지 | `identity_verifications.di_hash` UNIQUE INDEX → 동일인 중복 가입 DB 레벨 차단 |
| 2FA 미완료 차단 | `users.mfa_enabled = FALSE` 계정은 API 요청 시 `403 MFA_REQUIRED` 응답 (Spring Security 필터) |
| 개인정보 암호화 | 이메일·연락처·실명·TOTP 시드·CI/DI → **AES-256-GCM** (AWS KMS 관리 키) 애플리케이션 레벨 |
| 암호화 필드 검색 | `email_hash` / `phone_hash` / `di_hash` SHA-256 컬럼 병행 → 중복 체크·검색 |
| 계정 잠금 | `failed_login_count ≥ 5` → `locked_until = NOW() + 30분` 자동 설정 |
| 이력 중복 방지 | `talent_experiences` INSERT 트리거 → 동일 기간 풀타임 겹침 AI 1차 체크 |
| bonus_score 상한 | `CHECK (bonus_score BETWEEN 0 AND 10)` → total_score 100 초과 방지 |
| 콜드스타트 보정 | `is_new_talent` Generated Column → 매칭 쿼리에서 신규 인력 별도 가중치 적용 |
| 스코어 추적 | 모든 AI 스코어 변동 → `score_history` 시계열 기록 |
| Soft Delete | `deleted_at` 타임스탬프 (인력 프로필 실제 삭제 금지, 보존 기한 5년 후 파기) |
| 행위 추적 | 계약 서명·정산 승인·스코어 변경·개인정보 조회 → `audit_logs` 기록 (before/after JSONB) |
| 알림 재시도 | `notifications.retry_count` 관리 → FAILED 상태 재발송 처리 |
| 파일 보안 | 계약서·이력서 S3 저장 (SSE-KMS), Pre-signed URL 만료 시간 설정 (직접 노출 금지) |
