-- ============================================================
-- V1__init_schema.sql
-- 목적  : Linker 초기 스키마 생성 — 전체 테이블·인덱스 정의
-- 관련  : 04_database_design.md, 09_security_policy.md
-- 작성일: 2026-04-18
-- 주의  : 이 파일은 절대 수정 금지. 변경 필요 시 V2 이상으로 신규 작성. (Rule 4)
-- ============================================================

-- Extensions는 Docker init.sql에서 이미 생성됨
-- (uuid-ossp, vector, pg_trgm)

-- ── 1. users ──────────────────────────────────────────────────────────────
-- 전체 역할 계정. 2FA·실명인증 상태 포함.
-- 이메일·연락처·실명·TOTP 시드는 AES-256-GCM 암호화 저장. (Rule: 09_security_policy.md §1.2)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id     VARCHAR(255) UNIQUE,            -- OAuth/SSO 연동 ID
    email           TEXT NOT NULL,                  -- AES-256-GCM 암호화
    email_hash      VARCHAR(64) UNIQUE NOT NULL,    -- SHA-256 해시 (중복 가입·검색용)
    password_hash   VARCHAR(255),                   -- BCrypt (소셜 로그인 시 NULL)

    -- 실명인증 (NICE/KCB)
    real_name       TEXT,                           -- AES-256-GCM 암호화
    phone           TEXT,                           -- AES-256-GCM 암호화
    phone_hash      VARCHAR(64),                    -- SHA-256 해시
    identity_verified     BOOLEAN     DEFAULT FALSE,
    identity_verified_at  TIMESTAMPTZ,

    -- 2단계 인증
    mfa_enabled     BOOLEAN     DEFAULT FALSE,
    mfa_type        VARCHAR(10),                    -- TOTP | SMS
    mfa_secret      TEXT,                           -- TOTP 시드 (AES-256-GCM 암호화)
    mfa_backup_codes JSONB,                         -- 일회용 백업 코드 해시 배열

    -- 계정 상태
    role            VARCHAR(30) NOT NULL,           -- TALENT | PM | PROCUREMENT | ADMIN
    department      VARCHAR(100),
    is_active       BOOLEAN     DEFAULT TRUE,
    failed_login_count  INT     DEFAULT 0,
    locked_until        TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    last_login_at       TIMESTAMPTZ,
    last_login_ip       VARCHAR(45),

    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email_hash ON users (email_hash);
CREATE INDEX idx_users_phone_hash ON users (phone_hash);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_mfa_pending ON users (identity_verified)
    WHERE identity_verified = FALSE;

-- ── 2. identity_verifications ─────────────────────────────────────────────
-- 가입 시 NICE/KCB 본인확인 결과 저장.
-- CI/DI는 AES-256-GCM 암호화, di_hash로 중복 가입 DB 레벨 차단.
CREATE TABLE identity_verifications (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    provider       VARCHAR(20) NOT NULL,        -- NICE | KCB
    ci             TEXT,                        -- 연계정보 (AES-256-GCM 암호화)
    di             TEXT,                        -- 중복가입확인정보 (AES-256-GCM 암호화)
    di_hash        VARCHAR(64),                 -- SHA-256 해시 (중복 가입 차단 인덱스용)
    verified_name  TEXT,                        -- 인증된 실명 (AES-256-GCM 암호화)
    verified_phone TEXT,                        -- 인증된 휴대폰 (AES-256-GCM 암호화)
    status         VARCHAR(20) DEFAULT 'COMPLETED',  -- PENDING | COMPLETED | FAILED
    ip_address     VARCHAR(45),
    user_agent     VARCHAR(500),
    verified_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- DI 해시 기반 중복 가입 차단 (동일인 재가입 방지)
CREATE UNIQUE INDEX idx_identity_di_hash ON identity_verifications (di_hash)
    WHERE status = 'COMPLETED';
CREATE INDEX idx_identity_user ON identity_verifications (user_id);

-- ── 3. partner_companies ──────────────────────────────────────────────────
CREATE TABLE partner_companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    business_number VARCHAR(20) UNIQUE,
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(30),
    address         TEXT,
    contract_grade  VARCHAR(20) DEFAULT 'STANDARD',  -- STANDARD | PREFERRED | BLACKLISTED
    is_approved     BOOLEAN DEFAULT FALSE,
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 4. talent_profiles ────────────────────────────────────────────────────
-- AI 스코어: total = skill*0.4 + reliability*0.3 + performance*0.3 + bonus (상한 10점)
CREATE TABLE talent_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID UNIQUE NOT NULL REFERENCES users(id),
    company_id          UUID REFERENCES partner_companies(id),
    name                VARCHAR(100) NOT NULL,
    email               VARCHAR(255),               -- AES-256-GCM 암호화
    email_hash          VARCHAR(64),                -- SHA-256 해시
    phone               VARCHAR(30),                -- AES-256-GCM 암호화
    availability_status VARCHAR(20) DEFAULT 'AVAILABLE',  -- AVAILABLE | BUSY | REST
    available_from      DATE,
    desired_rate        DECIMAL(15,2),
    work_type           VARCHAR(20) DEFAULT 'REMOTE',     -- REMOTE | ONSITE | HYBRID
    deleted_at          TIMESTAMPTZ,                -- Soft Delete

    -- AI Scoring (F-1.3)
    skill_score       DECIMAL(5,2) DEFAULT 0 CHECK (skill_score BETWEEN 0 AND 100),
    reliability_score DECIMAL(5,2) DEFAULT 0 CHECK (reliability_score BETWEEN 0 AND 100),
    performance_score DECIMAL(5,2) DEFAULT 0 CHECK (performance_score BETWEEN 0 AND 100),
    bonus_score       DECIMAL(5,2) DEFAULT 0 CHECK (bonus_score BETWEEN 0 AND 10),
    total_score DECIMAL(5,2) GENERATED ALWAYS AS (
        skill_score * 0.4 + reliability_score * 0.3 + performance_score * 0.3 + bonus_score
    ) STORED,
    is_new_talent BOOLEAN GENERATED ALWAYS AS (performance_score = 0) STORED,

    -- Vector Search (F-1.4)
    profile_embedding vector(1536),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_talent_email_hash ON talent_profiles (email_hash);
CREATE INDEX idx_talent_company ON talent_profiles (company_id);
CREATE INDEX idx_talent_availability ON talent_profiles (availability_status, total_score DESC)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_talent_new ON talent_profiles (is_new_talent) WHERE is_new_talent = TRUE;
CREATE INDEX idx_talent_rate ON talent_profiles (desired_rate);

-- ── 5. talent_skills ──────────────────────────────────────────────────────
CREATE TABLE talent_skills (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id   UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    skill_name  VARCHAR(100) NOT NULL,
    level       VARCHAR(20),  -- JUNIOR | MID | SENIOR | EXPERT
    years       INT,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_talent ON talent_skills (talent_id);
CREATE INDEX idx_skills_name ON talent_skills (skill_name);

-- ── 6. talent_experiences ─────────────────────────────────────────────────
CREATE TABLE talent_experiences (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id           UUID REFERENCES talent_profiles(id) ON DELETE CASCADE,
    company_name        VARCHAR(200),
    project_name        VARCHAR(255) NOT NULL,
    role                VARCHAR(100),
    start_date          DATE NOT NULL,
    end_date            DATE,
    description         TEXT,
    tech_stack          JSONB,                  -- ["Java", "Spring", "React"]
    is_verified         BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'UNKNOWN',  -- VERIFIED | SUSPICIOUS | UNKNOWN
    suspicious_points   TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_experience_talent ON talent_experiences (talent_id);
CREATE INDEX idx_experience_project ON talent_experiences (project_name, company_name);

-- ── 7. project_opportunities ──────────────────────────────────────────────
CREATE TABLE project_opportunities (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                 VARCHAR(255) NOT NULL,
    description           TEXT,
    required_skills       JSONB,               -- [{"skill":"Java","level":"senior"}]
    budget_min            DECIMAL(15,2),
    budget_max            DECIMAL(15,2),
    start_date            DATE,
    end_date              DATE,
    work_type             VARCHAR(20) DEFAULT 'REMOTE',
    pm_id                 UUID NOT NULL REFERENCES users(id),
    status                VARCHAR(50) DEFAULT 'OPEN',  -- OPEN | MATCHED | CLOSED | CANCELLED
    requirement_embedding vector(1536),
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_pm ON project_opportunities (pm_id, status);
CREATE INDEX idx_project_budget ON project_opportunities (budget_min, budget_max);

-- ── 8. match_proposals ────────────────────────────────────────────────────
CREATE TABLE match_proposals (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id       UUID REFERENCES project_opportunities(id),
    talent_id        UUID REFERENCES talent_profiles(id),
    similarity_score DECIMAL(5,4),
    ai_reason        TEXT,
    interview_guide  TEXT,
    status           VARCHAR(50) DEFAULT 'PENDING',  -- PENDING | ACCEPTED | REJECTED | EXPIRED
    rejected_by_pm   BOOLEAN DEFAULT FALSE,
    proposed_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    responded_at     TIMESTAMPTZ
);

CREATE INDEX idx_proposal_project ON match_proposals (project_id, status);
CREATE INDEX idx_proposal_talent ON match_proposals (talent_id, status);

-- ── 9. interview_records ──────────────────────────────────────────────────
CREATE TABLE interview_records (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id    UUID REFERENCES match_proposals(id),
    interviewer_id UUID REFERENCES users(id),
    scheduled_at   TIMESTAMPTZ NOT NULL,
    completed_at   TIMESTAMPTZ,
    interview_type VARCHAR(30),          -- VIDEO | PHONE | ONSITE
    result         VARCHAR(20),          -- PASS | FAIL | PENDING
    notes          TEXT,
    created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 10. contracts ─────────────────────────────────────────────────────────
CREATE TABLE contracts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id        UUID REFERENCES project_opportunities(id),
    talent_id         UUID REFERENCES talent_profiles(id),
    procurement_id    UUID REFERENCES users(id),
    unit_price        DECIMAL(15,2),
    total_amount      DECIMAL(15,2),
    contract_terms    TEXT,
    contract_file_url VARCHAR(500),      -- MinIO/S3 경로 (Pre-signed URL로만 접근)
    ai_price_analysis JSONB,
    status            VARCHAR(50) DEFAULT 'DRAFT',  -- DRAFT | SIGNED | EXPIRED | TERMINATED
    signed_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contracts_status ON contracts (status);
CREATE INDEX idx_contracts_talent ON contracts (talent_id, status);
CREATE INDEX idx_contracts_project ON contracts (project_id);

-- ── 11. timesheets ────────────────────────────────────────────────────────
CREATE TABLE timesheets (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id      UUID REFERENCES contracts(id),
    talent_id        UUID REFERENCES talent_profiles(id),
    work_date        DATE NOT NULL,
    hours_worked     DECIMAL(4,2) NOT NULL,
    work_description TEXT,
    status           VARCHAR(30) DEFAULT 'SUBMITTED',  -- SUBMITTED | APPROVED | REJECTED
    ai_anomaly_flag  BOOLEAN DEFAULT FALSE,
    approved_by      UUID REFERENCES users(id),
    approved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timesheet_contract_status ON timesheets (contract_id, status);

-- ── 12. work_reports ──────────────────────────────────────────────────────
CREATE TABLE work_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id     UUID REFERENCES contracts(id),
    talent_id       UUID REFERENCES talent_profiles(id),
    report_week     DATE NOT NULL,
    content         TEXT NOT NULL,
    ai_risk_level   VARCHAR(20),           -- LOW | MEDIUM | HIGH
    ai_risk_summary TEXT,
    sentiment_score DECIMAL(3,2),          -- -1.00 ~ 1.00
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 13. evaluations ───────────────────────────────────────────────────────
CREATE TABLE evaluations (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id           UUID REFERENCES contracts(id),
    evaluator_id          UUID NOT NULL REFERENCES users(id),
    evaluator_role        VARCHAR(20),     -- PM | PEER
    raw_feedback          TEXT,
    structured_feedback   JSONB,
    trust_score           DECIMAL(5,2),
    system_log_match_rate DECIMAL(5,2),
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 14. score_history ─────────────────────────────────────────────────────
CREATE TABLE score_history (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id    UUID REFERENCES talent_profiles(id),
    score_type   VARCHAR(30),             -- SKILL | RELIABILITY | PERFORMANCE | BONUS
    before_value DECIMAL(5,2),
    after_value  DECIMAL(5,2),
    reason       TEXT,
    changed_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_score_history_talent ON score_history (talent_id, changed_at DESC);

-- ── 15. verification_logs ─────────────────────────────────────────────────
CREATE TABLE verification_logs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id     UUID REFERENCES talent_experiences(id),
    verification_type VARCHAR(50),        -- ACADEMIC | CERTIFICATE | PROJECT_EXISTENCE
    source            VARCHAR(100),
    result            VARCHAR(30),        -- PASSED | FAILED | MANUAL_REQUIRED
    detail            JSONB,
    verified_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ── 16. notifications ─────────────────────────────────────────────────────
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id),
    type        VARCHAR(50) NOT NULL,     -- PROPOSAL | INTERVIEW | CONTRACT | SETTLEMENT | RISK_ALERT
    channel     VARCHAR(20) NOT NULL,     -- EMAIL | SLACK | IN_APP
    title       VARCHAR(255),
    body        TEXT,
    is_read     BOOLEAN DEFAULT FALSE,
    sent_at     TIMESTAMPTZ,
    status      VARCHAR(20) DEFAULT 'PENDING',  -- PENDING | SENT | FAILED
    retry_count INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read)
    WHERE is_read = FALSE;
CREATE INDEX idx_notifications_status ON notifications (status, retry_count)
    WHERE status = 'FAILED';

-- ── 17. audit_logs ────────────────────────────────────────────────────────
-- 계약 서명·정산 승인·스코어 변경·개인정보 조회 등 주요 행위 추적 (Rule 1)
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id    UUID NOT NULL REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,   -- CONTRACT_SIGN | SCORE_UPDATE | SETTLEMENT_APPROVE 등
    target_type VARCHAR(50),             -- contracts | talent_profiles | timesheets 등
    target_id   UUID,
    before_data JSONB,                   -- 변경 전 스냅샷
    after_data  JSONB,                   -- 변경 후 스냅샷
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_target ON audit_logs (target_type, target_id);

-- ── 18. chat_histories (AI 챗 세션 영구 저장) ─────────────────────────────
CREATE TABLE chat_histories (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id),
    session_id VARCHAR(100) NOT NULL,
    summary    TEXT,               -- 세션 만료 시 AI 요약본
    messages   JSONB,              -- 전체 대화 이력
    started_at TIMESTAMPTZ,
    ended_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_user ON chat_histories (user_id, ended_at DESC);

-- ── 벡터 유사도 인덱스 (HNSW — Phase 2에서 데이터 충분 후 생성 권장) ─────
-- CREATE INDEX idx_talent_embedding ON talent_profiles
--     USING hnsw (profile_embedding vector_cosine_ops);
-- CREATE INDEX idx_project_embedding ON project_opportunities
--     USING hnsw (requirement_embedding vector_cosine_ops);
