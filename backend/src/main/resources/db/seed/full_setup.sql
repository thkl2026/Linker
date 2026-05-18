-- ============================================================
-- full_setup.sql
-- 목적  : linker DB 스키마 생성 + 개발 시드 데이터 삽입 (올인원)
-- 실행  : psql -h <host> -U postgres -d linker -f full_setup.sql
-- 주의  : 개발·데모 전용. 프로덕션 절대 금지.
-- ============================================================

\set ON_ERROR_STOP on

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- Extensions
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ──────────────────────────────────────────────────────────────
-- V1 : 기본 스키마
-- ──────────────────────────────────────────────────────────────

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id     VARCHAR(255) UNIQUE,
    email           TEXT NOT NULL,
    email_hash      VARCHAR(64) UNIQUE NOT NULL,
    password_hash   VARCHAR(255),
    real_name       TEXT,
    phone           TEXT,
    phone_hash      VARCHAR(64),
    identity_verified     BOOLEAN     DEFAULT FALSE,
    identity_verified_at  TIMESTAMPTZ,
    mfa_enabled     BOOLEAN     DEFAULT FALSE,
    mfa_type        VARCHAR(10),
    mfa_secret      TEXT,
    mfa_backup_codes JSONB,
    role            VARCHAR(30) NOT NULL,
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
CREATE INDEX idx_users_mfa_pending ON users (identity_verified) WHERE identity_verified = FALSE;

CREATE TABLE identity_verifications (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    provider       VARCHAR(20) NOT NULL,
    ci             TEXT,
    di             TEXT,
    di_hash        VARCHAR(64),
    verified_name  TEXT,
    verified_phone TEXT,
    status         VARCHAR(20) DEFAULT 'COMPLETED',
    ip_address     VARCHAR(45),
    user_agent     VARCHAR(500),
    verified_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_identity_di_hash ON identity_verifications (di_hash) WHERE status = 'COMPLETED';
CREATE INDEX idx_identity_user ON identity_verifications (user_id);

CREATE TABLE partner_companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(200) NOT NULL,
    business_number VARCHAR(20) UNIQUE,
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(30),
    address         TEXT,
    contract_grade  VARCHAR(20) DEFAULT 'STANDARD',
    is_approved     BOOLEAN DEFAULT FALSE,
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE talent_profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID UNIQUE NOT NULL REFERENCES users(id),
    company_id          UUID REFERENCES partner_companies(id),
    name                VARCHAR(100) NOT NULL,
    email               VARCHAR(255),
    email_hash          VARCHAR(64),
    phone               VARCHAR(30),
    availability_status VARCHAR(20) DEFAULT 'AVAILABLE',
    available_from      DATE,
    desired_rate        DECIMAL(15,2),
    work_type           VARCHAR(20) DEFAULT 'REMOTE',
    deleted_at          TIMESTAMPTZ,
    skill_score         DECIMAL(5,2) DEFAULT 0 CHECK (skill_score BETWEEN 0 AND 100),
    reliability_score   DECIMAL(5,2) DEFAULT 0 CHECK (reliability_score BETWEEN 0 AND 100),
    performance_score   DECIMAL(5,2) DEFAULT 0 CHECK (performance_score BETWEEN 0 AND 100),
    bonus_score         DECIMAL(5,2) DEFAULT 0 CHECK (bonus_score BETWEEN 0 AND 10),
    total_score DECIMAL(5,2) GENERATED ALWAYS AS (
        skill_score * 0.4 + reliability_score * 0.3 + performance_score * 0.3 + bonus_score
    ) STORED,
    is_new_talent BOOLEAN GENERATED ALWAYS AS (performance_score = 0) STORED,
    profile_embedding   vector(768),
    embedding_updated_at TIMESTAMPTZ,
    parsed_resume       JSONB,
    resume_file_key     VARCHAR(500),
    history_risk_level  VARCHAR(20) DEFAULT 'UNKNOWN',
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_talent_email_hash ON talent_profiles (email_hash);
CREATE INDEX idx_talent_company ON talent_profiles (company_id);
CREATE INDEX idx_talent_availability ON talent_profiles (availability_status, total_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_talent_new ON talent_profiles (is_new_talent) WHERE is_new_talent = TRUE;
CREATE INDEX idx_talent_rate ON talent_profiles (desired_rate);
CREATE INDEX idx_talent_embedding_hnsw ON talent_profiles
    USING hnsw (profile_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE TABLE talent_skills (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id   UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    skill_name  VARCHAR(100) NOT NULL,
    level       VARCHAR(20),
    years       INT,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_talent ON talent_skills (talent_id);
CREATE INDEX idx_skills_name ON talent_skills (skill_name);

CREATE TABLE talent_experiences (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id           UUID REFERENCES talent_profiles(id) ON DELETE CASCADE,
    company_name        VARCHAR(200),
    project_name        VARCHAR(255) NOT NULL,
    role                VARCHAR(100),
    start_date          DATE NOT NULL,
    end_date            DATE,
    description         TEXT,
    tech_stack          JSONB,
    is_verified         BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(50) DEFAULT 'UNKNOWN',
    suspicious_points   TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_experience_talent ON talent_experiences (talent_id);
CREATE INDEX idx_experience_project ON talent_experiences (project_name, company_name);

CREATE TABLE project_opportunities (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                 VARCHAR(255) NOT NULL,
    description           TEXT,
    required_skills       JSONB,
    budget_min            DECIMAL(15,2),
    budget_max            DECIMAL(15,2),
    start_date            DATE,
    end_date              DATE,
    work_type             VARCHAR(20) DEFAULT 'REMOTE',
    pm_id                 UUID NOT NULL REFERENCES users(id),
    status                VARCHAR(50) DEFAULT 'OPEN',
    requirement_embedding vector(768),
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_pm ON project_opportunities (pm_id, status);
CREATE INDEX idx_project_budget ON project_opportunities (budget_min, budget_max);

CREATE TABLE contracts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id        UUID REFERENCES project_opportunities(id),
    talent_id         UUID REFERENCES talent_profiles(id),
    procurement_id    UUID REFERENCES users(id),
    unit_price        DECIMAL(15,2),
    total_amount      DECIMAL(15,2),
    contract_terms    TEXT,
    contract_file_url VARCHAR(500),
    ai_price_analysis JSONB,
    status            VARCHAR(50) DEFAULT 'DRAFT',
    signed_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contracts_status ON contracts (status);
CREATE INDEX idx_contracts_talent ON contracts (talent_id, status);
CREATE INDEX idx_contracts_project ON contracts (project_id);

CREATE TABLE timesheets (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id      UUID REFERENCES contracts(id),
    talent_id        UUID REFERENCES talent_profiles(id),
    work_date        DATE NOT NULL,
    hours_worked     DECIMAL(4,2) NOT NULL,
    work_description TEXT,
    status           VARCHAR(30) DEFAULT 'SUBMITTED',
    ai_anomaly_flag  BOOLEAN DEFAULT FALSE,
    approved_by      UUID REFERENCES users(id),
    approved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_timesheet_contract_status ON timesheets (contract_id, status);

CREATE TABLE work_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id     UUID REFERENCES contracts(id),
    talent_id       UUID REFERENCES talent_profiles(id),
    report_week     DATE NOT NULL,
    content         TEXT NOT NULL,
    ai_risk_level   VARCHAR(20),
    ai_risk_summary TEXT,
    sentiment_score DECIMAL(3,2),
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evaluations (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id           UUID REFERENCES contracts(id),
    evaluator_id          UUID NOT NULL REFERENCES users(id),
    evaluator_role        VARCHAR(20),
    raw_feedback          TEXT,
    structured_feedback   JSONB,
    trust_score           DECIMAL(5,2),
    system_log_match_rate DECIMAL(5,2),
    created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE score_history (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id    UUID REFERENCES talent_profiles(id),
    score_type   VARCHAR(30),
    before_value DECIMAL(5,2),
    after_value  DECIMAL(5,2),
    reason       TEXT,
    changed_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_score_history_talent ON score_history (talent_id, changed_at DESC);

CREATE TABLE verification_logs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experience_id     UUID REFERENCES talent_experiences(id),
    verification_type VARCHAR(50),
    source            VARCHAR(100),
    result            VARCHAR(30),
    detail            JSONB,
    verified_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id),
    type        VARCHAR(50) NOT NULL,
    channel     VARCHAR(20) NOT NULL,
    title       VARCHAR(255),
    body        TEXT,
    is_read     BOOLEAN DEFAULT FALSE,
    sent_at     TIMESTAMPTZ,
    status      VARCHAR(20) DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_status ON notifications (status, retry_count) WHERE status = 'FAILED';

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id    UUID NOT NULL REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id   UUID,
    before_data JSONB,
    after_data  JSONB,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_target ON audit_logs (target_type, target_id);

CREATE TABLE chat_histories (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id),
    session_id VARCHAR(100) NOT NULL,
    summary    TEXT,
    messages   JSONB,
    started_at TIMESTAMPTZ,
    ended_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_user ON chat_histories (user_id, ended_at DESC);

-- ──────────────────────────────────────────────────────────────
-- V2 : AI 파이프라인 (match_proposals는 V2 스키마로 신규 생성)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE ai_jobs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type         VARCHAR(30)  NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    talent_id    UUID REFERENCES talent_profiles(id) ON DELETE SET NULL,
    payload      JSONB,
    result       JSONB,
    error_msg    TEXT,
    created_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_jobs_talent_id ON ai_jobs (talent_id);
CREATE INDEX idx_ai_jobs_status    ON ai_jobs (status) WHERE status IN ('PENDING', 'PROCESSING');

CREATE TABLE match_proposals (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id       UUID NOT NULL REFERENCES project_opportunities(id) ON DELETE CASCADE,
    talent_id        UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5,4),
    match_reason     TEXT,
    strengths        JSONB,
    concerns         JSONB,
    interview_guide  JSONB,
    status           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, talent_id)
);

CREATE INDEX idx_match_proposals_project  ON match_proposals (project_id);
CREATE INDEX idx_match_proposals_talent   ON match_proposals (talent_id);
CREATE INDEX idx_match_proposals_score    ON match_proposals (similarity_score DESC NULLS LAST);

CREATE TABLE interview_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id     UUID NOT NULL REFERENCES match_proposals(id) ON DELETE CASCADE,
    scheduled_at    TIMESTAMPTZ,
    location        VARCHAR(255),
    result          VARCHAR(20),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interview_records_proposal ON interview_records (proposal_id);

CREATE TABLE device_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token   VARCHAR(500) NOT NULL,
    platform    VARCHAR(10) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, fcm_token)
);

CREATE INDEX idx_device_tokens_user ON device_tokens (user_id);

-- ──────────────────────────────────────────────────────────────
-- V3 : 정산
-- ──────────────────────────────────────────────────────────────

CREATE TABLE settlements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id     UUID NOT NULL REFERENCES contracts(id) ON DELETE RESTRICT,
    talent_id       UUID NOT NULL REFERENCES talent_profiles(id),
    settlement_month DATE NOT NULL,
    total_hours     DECIMAL(8,2) NOT NULL,
    unit_price      DECIMAL(15,2) NOT NULL,
    gross_amount    DECIMAL(15,2) NOT NULL,
    deduction       DECIMAL(15,2) DEFAULT 0,
    net_amount      DECIMAL(15,2) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (contract_id, settlement_month)
);

CREATE INDEX idx_settlements_contract ON settlements (contract_id);
CREATE INDEX idx_settlements_talent   ON settlements (talent_id);
CREATE INDEX idx_settlements_status   ON settlements (status, settlement_month DESC);

-- ──────────────────────────────────────────────────────────────
-- V4 : Peer Review + Self Certification
-- ──────────────────────────────────────────────────────────────

CREATE TABLE peer_reviews (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id           UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    reviewer_id         UUID NOT NULL REFERENCES users(id),
    contract_id         UUID REFERENCES contracts(id),
    collaboration_score INT NOT NULL CHECK (collaboration_score BETWEEN 1 AND 5),
    technical_score     INT NOT NULL CHECK (technical_score BETWEEN 1 AND 5),
    reliability_score   INT NOT NULL CHECK (reliability_score BETWEEN 1 AND 5),
    comment             TEXT,
    is_anonymous        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (talent_id, reviewer_id, contract_id)
);

CREATE INDEX idx_peer_reviews_talent   ON peer_reviews (talent_id);
CREATE INDEX idx_peer_reviews_reviewer ON peer_reviews (reviewer_id);

CREATE TABLE self_certifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id       UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    source_type     VARCHAR(30) NOT NULL,
    source_url      VARCHAR(500) NOT NULL,
    analysis_result JSONB,
    bonus_score     DECIMAL(5,2) DEFAULT 0 CHECK (bonus_score BETWEEN 0 AND 10),
    analyzed_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (talent_id, source_url)
);

CREATE INDEX idx_self_cert_talent ON self_certifications (talent_id);

-- ──────────────────────────────────────────────────────────────
-- Flyway 히스토리 등록 (Spring Boot 재기동 시 재실행 방지)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE flyway_schema_history (
    installed_rank INT          NOT NULL,
    version        VARCHAR(50),
    description    VARCHAR(200) NOT NULL,
    type           VARCHAR(20)  NOT NULL,
    script         VARCHAR(1000) NOT NULL,
    checksum       INT,
    installed_by   VARCHAR(100) NOT NULL,
    installed_on   TIMESTAMP    NOT NULL DEFAULT now(),
    execution_time INT          NOT NULL,
    success        BOOLEAN      NOT NULL,
    CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank)
);

CREATE INDEX flyway_schema_history_s_idx ON flyway_schema_history (success);

INSERT INTO flyway_schema_history
    (installed_rank, version, description, type, script, checksum, installed_by, execution_time, success)
VALUES
    (1, '1', 'init schema',    'SQL', 'V1__init_schema.sql',    -1, 'postgres', 500, TRUE),
    (2, '2', 'ai pipeline',    'SQL', 'V2__ai_pipeline.sql',    -1, 'postgres', 300, TRUE),
    (3, '3', 'settlements',    'SQL', 'V3__settlements.sql',     -1, 'postgres', 100, TRUE),
    (4, '4', 'peer reviews',   'SQL', 'V4__peer_reviews.sql',   -1, 'postgres', 100, TRUE);

-- ──────────────────────────────────────────────────────────────
-- 시드 데이터
-- ──────────────────────────────────────────────────────────────

-- 1. users
INSERT INTO users (id, email, email_hash, role, is_active, identity_verified, mfa_enabled) VALUES
    ('00000000-0000-0000-0000-000000000001','admin@linker.co.kr',    'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60001','ADMIN',       TRUE,TRUE,FALSE),
    ('00000000-0000-0000-0000-000000000002','pm.kim@linker.co.kr',   'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60002','PM',          TRUE,TRUE,FALSE),
    ('00000000-0000-0000-0000-000000000003','pm.lee@linker.co.kr',   'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60003','PM',          TRUE,TRUE,FALSE),
    ('00000000-0000-0000-0000-000000000004','proc.park@linker.co.kr','a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60004','PROCUREMENT', TRUE,TRUE,FALSE),
    ('00000000-0000-0000-0000-000000000005','proc.choi@linker.co.kr','a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60005','PROCUREMENT', TRUE,TRUE,FALSE),
    ('00000000-0000-0000-0000-000000000006','talent.kim@example.com','a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60006','TALENT',      TRUE,TRUE,FALSE),
    ('00000000-0000-0000-0000-000000000007','talent.lee@example.com','a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60007','TALENT',      TRUE,TRUE,FALSE),
    ('00000000-0000-0000-0000-000000000008','talent.park@example.com','a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60008','TALENT',     TRUE,TRUE,FALSE),
    ('00000000-0000-0000-0000-000000000009','talent.choi@example.com','a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60009','TALENT',     TRUE,TRUE,FALSE),
    ('00000000-0000-0000-0000-000000000010','talent.jung@example.com','a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60010','TALENT',     TRUE,TRUE,FALSE);

-- 2. partner_companies
INSERT INTO partner_companies (id, name, business_number, contact_email, contact_phone, address, contract_grade, is_approved, approved_by, approved_at) VALUES
    ('00000000-0000-0000-0001-000000000001','링커소프트(주)','123-45-67890','contact@linkersoft.co.kr','02-1234-5678','서울 강남구 테헤란로 100','PREFERRED',TRUE,'00000000-0000-0000-0000-000000000001','2025-01-15 09:00:00+09'),
    ('00000000-0000-0000-0001-000000000002','넥스트테크(주)','987-65-43210','hr@nexttech.co.kr',       '02-9876-5432','서울 마포구 월드컵북로 200','STANDARD', TRUE,'00000000-0000-0000-0000-000000000001','2025-03-20 09:00:00+09');

-- 3. talent_profiles
INSERT INTO talent_profiles (id, user_id, company_id, name, email, email_hash, availability_status, available_from, desired_rate, work_type, skill_score, reliability_score, performance_score, bonus_score) VALUES
    ('00000000-0000-0000-0002-000000000001','00000000-0000-0000-0000-000000000006','00000000-0000-0000-0001-000000000001','김인재', 'talent.kim@example.com', 'b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a60001','BUSY',     '2026-06-01',6000000,'HYBRID',85,88,82,5),
    ('00000000-0000-0000-0002-000000000002','00000000-0000-0000-0000-000000000007','00000000-0000-0000-0001-000000000001','이개발', 'talent.lee@example.com', 'b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a60002','AVAILABLE','2026-05-01',5500000,'REMOTE',78,75,70,3),
    ('00000000-0000-0000-0002-000000000003','00000000-0000-0000-0000-000000000008','00000000-0000-0000-0001-000000000002','박서버', 'talent.park@example.com','b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a60003','AVAILABLE','2026-05-15',5800000,'REMOTE',82,80,75,4),
    ('00000000-0000-0000-0002-000000000004','00000000-0000-0000-0000-000000000009','00000000-0000-0000-0001-000000000002','최프론트','talent.choi@example.com','b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a60004','BUSY',     '2026-07-01',5200000,'HYBRID',76,72,68,2),
    ('00000000-0000-0000-0002-000000000005','00000000-0000-0000-0000-000000000010','00000000-0000-0000-0001-000000000001','정클라우드','talent.jung@example.com','b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a60005','AVAILABLE','2026-05-01',6500000,'REMOTE',90,85,80,6);

-- 4. talent_skills
INSERT INTO talent_skills (talent_id, skill_name, level, years) VALUES
    ('00000000-0000-0000-0002-000000000001','Java',        'EXPERT',10),('00000000-0000-0000-0002-000000000001','Spring Boot','EXPERT',8),
    ('00000000-0000-0000-0002-000000000001','MSA',         'SENIOR',5), ('00000000-0000-0000-0002-000000000001','Kubernetes', 'SENIOR',4),
    ('00000000-0000-0000-0002-000000000001','PostgreSQL',  'SENIOR',7),
    ('00000000-0000-0000-0002-000000000002','React',       'EXPERT',7), ('00000000-0000-0000-0002-000000000002','TypeScript', 'SENIOR',5),
    ('00000000-0000-0000-0002-000000000002','Node.js',     'SENIOR',6), ('00000000-0000-0000-0002-000000000002','Next.js',    'MID',   3),
    ('00000000-0000-0000-0002-000000000003','Python',      'EXPERT',8), ('00000000-0000-0000-0002-000000000003','PyTorch',    'SENIOR',4),
    ('00000000-0000-0000-0002-000000000003','Airflow',     'SENIOR',3), ('00000000-0000-0000-0002-000000000003','Spark',      'MID',   2),
    ('00000000-0000-0000-0002-000000000004','Vue.js',      'EXPERT',6), ('00000000-0000-0000-0002-000000000004','React',      'SENIOR',4),
    ('00000000-0000-0000-0002-000000000004','JavaScript',  'EXPERT',8), ('00000000-0000-0000-0002-000000000004','CSS/Tailwind','SENIOR',5),
    ('00000000-0000-0000-0002-000000000005','AWS',         'EXPERT',8), ('00000000-0000-0000-0002-000000000005','Terraform',  'EXPERT',6),
    ('00000000-0000-0000-0002-000000000005','Docker',      'EXPERT',7), ('00000000-0000-0000-0002-000000000005','Kubernetes', 'SENIOR',5);

-- 5. talent_experiences
INSERT INTO talent_experiences (id, talent_id, company_name, project_name, role, start_date, end_date, description, tech_stack, is_verified, verification_status) VALUES
    ('00000000-0000-0000-0007-000000000001','00000000-0000-0000-0002-000000000001','(주)한국핀테크',    '간편결제 플랫폼 구축',       '백엔드 개발 리드','2022-03-01','2024-12-31','MSA 기반 간편결제 플랫폼. 일 거래 300만건 처리.','["Java","Spring Boot","Kafka","Redis","PostgreSQL","Kubernetes"]',TRUE,'VERIFIED'),
    ('00000000-0000-0000-0007-000000000002','00000000-0000-0000-0002-000000000001','대한화재보험(주)',  '레거시 시스템 MSA 전환',     '아키텍처 설계',  '2020-01-01','2022-02-28','모놀리식 Java 레거시를 12개 MSA로 분리.',        '["Java","Spring Cloud","MySQL","RabbitMQ"]',              FALSE,'UNKNOWN'),
    ('00000000-0000-0000-0007-000000000003','00000000-0000-0000-0002-000000000003','데이터클라우드(주)','실시간 추천 엔진 개발',       'ML 엔지니어',   '2023-06-01','2025-12-31','Airflow+Spark 일 1TB 파이프라인. 추천 정확도 34% 향상.','["Python","PyTorch","Airflow","Spark","AWS S3","Redis"]', TRUE,'VERIFIED'),
    ('00000000-0000-0000-0007-000000000004','00000000-0000-0000-0002-000000000005','글로벌클라우드(주)','AWS 클라우드 전환 프로젝트',  'DevOps 리드',  '2021-03-01','2025-06-30','On-premise → AWS. 비용 42% 절감, 배포 주기 2주→1일.','["AWS","Terraform","Docker","Kubernetes","GitHub Actions"]',TRUE,'VERIFIED');

-- 6. project_opportunities
INSERT INTO project_opportunities (id, title, description, required_skills, budget_min, budget_max, start_date, end_date, work_type, pm_id, status) VALUES
    ('00000000-0000-0000-0003-000000000001','금융 플랫폼 MSA 전환',             '모놀리식 Java 금융 시스템을 12개 마이크로서비스로 분리 전환.',                        '["Java","Spring Boot","MSA","Kubernetes","Kafka"]',    5000000,8000000,'2026-04-01','2027-03-31','HYBRID','00000000-0000-0000-0000-000000000002','MATCHED'),
    ('00000000-0000-0000-0003-000000000002','이커머스 모바일 프론트엔드 고도화', 'React Native → Next.js 웹 앱 전환 및 UI/UX 개선. 성능 최적화(LCP 2.5초 이내).', '["React","Next.js","TypeScript","Tailwind CSS"]',     4000000,6500000,'2026-05-01','2026-12-31','REMOTE','00000000-0000-0000-0000-000000000003','OPEN'),
    ('00000000-0000-0000-0003-000000000003','ML 데이터 파이프라인 구축',         '실시간 사용자 행동 데이터 수집→정제→모델 학습 자동화. 일 2TB 처리.',                 '["Python","Airflow","Spark","PyTorch","AWS"]',        5500000,9000000,'2026-06-01','2027-05-31','REMOTE','00000000-0000-0000-0000-000000000002','OPEN');

-- 7. match_proposals
INSERT INTO match_proposals (id, project_id, talent_id, similarity_score, match_reason, strengths, concerns, interview_guide, status) VALUES
    ('00000000-0000-0000-0004-000000000001','00000000-0000-0000-0003-000000000001','00000000-0000-0000-0002-000000000001',0.9412,
     'Java/Spring Boot 10년 경력과 MSA 전환 경험이 프로젝트 요구사항과 정확히 일치합니다.',
     '["Spring Boot 마이크로서비스 전문성","Kafka 이벤트 드리븐 경험","금융 레거시 전환 성공 이력"]',
     '["신규 팀원 온보딩 경험 부족 가능성"]',
     '["MSA 전환 시 데이터 정합성 전략은?","Kafka vs RabbitMQ 선택 기준은?","무중단 배포 전략 경험이 있으신가요?"]',
     'ACCEPTED'),
    ('00000000-0000-0000-0004-000000000002','00000000-0000-0000-0003-000000000001','00000000-0000-0000-0002-000000000002',0.8834,
     'TypeScript/Node.js 기반 BFF 계층 구축에 적합합니다.',
     '["TypeScript 정적 타입 활용","REST API 설계 경험"]',
     '["Java Spring 경험 없음","MSA 운영 경험 미검증"]',
     '["Node.js로 MSA BFF를 구현한 경험이 있으신가요?"]',
     'PENDING'),
    ('00000000-0000-0000-0004-000000000003','00000000-0000-0000-0003-000000000002','00000000-0000-0000-0002-000000000004',0.9156,
     'Vue.js/React 전문가로 Next.js 마이그레이션 역량이 충분합니다.',
     '["React/Vue.js 이중 전문성","Tailwind CSS 고급 활용"]',
     '["Next.js App Router 실전 경험 미검증"]',
     '["React → Next.js 전환 시 SSR/SSG 전략을 어떻게 구분하시나요?"]',
     'ACCEPTED'),
    ('00000000-0000-0000-0004-000000000004','00000000-0000-0000-0003-000000000002','00000000-0000-0000-0002-000000000002',0.8721,
     'React + TypeScript 전문가로 프론트엔드 요구사항 충족 가능합니다.',
     '["React 전문성","TypeScript 숙련도"]',
     '["Next.js 경험 제한적"]',
     '["Next.js에서 장바구니 상태 관리 전략을 설명해 주세요."]',
     'PENDING'),
    ('00000000-0000-0000-0004-000000000005','00000000-0000-0000-0003-000000000003','00000000-0000-0000-0002-000000000003',0.9023,
     'Airflow + Spark 기반 대용량 파이프라인 운영 경험이 요구사항과 높게 일치합니다.',
     '["Airflow DAG 설계 실전 경험","Spark 대용량 처리","PyTorch 모델 학습 자동화"]',
     '["AWS Glue/SageMaker 경험 미검증"]',
     '["Airflow DAG 장애 복구 전략을 설명해 주세요.","Spark 파티셔닝 튜닝 경험이 있으신가요?"]',
     'PENDING');

-- 8. interview_records
INSERT INTO interview_records (id, proposal_id, scheduled_at, location, result, notes) VALUES
    ('00000000-0000-0000-0006-000000000001','00000000-0000-0000-0004-000000000001',
     '2026-03-25 14:00:00+09','https://meet.google.com/linker-interview-001',
     'PASS','MSA 설계 경험 풍부, 커뮤니케이션 우수. Kafka 심화 질문에 명확한 답변. 즉시 투입 가능.');

-- 9. contracts
INSERT INTO contracts (id, project_id, talent_id, procurement_id, unit_price, total_amount, contract_terms, ai_price_analysis, status, signed_at) VALUES
    ('00000000-0000-0000-0005-000000000001',
     '00000000-0000-0000-0003-000000000001','00000000-0000-0000-0002-000000000001','00000000-0000-0000-0000-000000000004',
     50000,48000000,'월 160시간 기준. 초과 시 동일 단가. 매월 말일 확인 후 익월 10일 정산. 계약 기간 12개월.',
     '{"recommendation":"FAIR","marketRange":{"min":45000,"max":60000},"analysis":"시니어 Java/MSA 시장 단가 내. 적정.","riskScore":0.12}',
     'SIGNED','2026-04-01 10:00:00+09'),
    ('00000000-0000-0000-0005-000000000002',
     '00000000-0000-0000-0003-000000000002','00000000-0000-0000-0002-000000000004','00000000-0000-0000-0000-000000000005',
     45000,40320000,'월 160시간 기준. 원격 근무. 주 1회 화상 스탠드업 필수. 계약 기간 8개월.',
     '{"recommendation":"FAIR","marketRange":{"min":40000,"max":55000},"analysis":"프론트엔드 시니어 단가 적정.","riskScore":0.08}',
     'DRAFT',NULL);

-- 10. timesheets
INSERT INTO timesheets (contract_id, talent_id, work_date, hours_worked, work_description, status, ai_anomaly_flag, approved_by, approved_at) VALUES
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-03',8.0,'AS-IS 아키텍처 분석 및 분리 대상 서비스 도출',             'APPROVED',FALSE,'00000000-0000-0000-0000-000000000002','2026-03-08 18:00:00+09'),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-04',8.0,'인증 서비스 REST API 스펙 초안 작성',                       'APPROVED',FALSE,'00000000-0000-0000-0000-000000000002','2026-03-08 18:00:00+09'),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-05',8.0,'인증 서비스 전용 PostgreSQL 스키마 설계',                   'APPROVED',FALSE,'00000000-0000-0000-0000-000000000002','2026-03-08 18:00:00+09'),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-06',8.0,'JWT 발급·검증·갱신 로직 구현',                              'APPROVED',FALSE,'00000000-0000-0000-0000-000000000002','2026-03-08 18:00:00+09'),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-07',8.0,'단위 테스트 작성 및 코드 리뷰 반영',                        'APPROVED',FALSE,'00000000-0000-0000-0000-000000000002','2026-03-08 18:00:00+09'),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-10',8.0,'계정 서비스 분리: 회원가입·프로필 관리 MSA 전환',           'APPROVED',FALSE,'00000000-0000-0000-0000-000000000002','2026-03-15 18:00:00+09'),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-11',8.0,'Kafka 이벤트 스키마 정의 및 토픽 구조 설계',                'APPROVED',FALSE,'00000000-0000-0000-0000-000000000002','2026-03-15 18:00:00+09'),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-12',8.0,'Kafka Consumer 구현: 회원 이벤트 구독·처리 로직',          'APPROVED',FALSE,'00000000-0000-0000-0000-000000000002','2026-03-15 18:00:00+09'),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-13',8.0,'통합 테스트: 인증 ↔ 계정 서비스 간 통신 검증',             'APPROVED',FALSE,'00000000-0000-0000-0000-000000000002','2026-03-15 18:00:00+09'),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-14',8.0,'Confluence 아키텍처 결정 레코드(ADR) 문서화',               'APPROVED',FALSE,'00000000-0000-0000-0000-000000000002','2026-03-15 18:00:00+09'),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-17',8.0,'결제 서비스 도메인 분석 및 외부 PG사 연동 설계',            'SUBMITTED',FALSE,NULL,NULL),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-18',11.5,'결제 서비스 긴급 장애 대응: PG사 콜백 처리 버그 수정 및 핫픽스 배포','SUBMITTED',TRUE,NULL,NULL);

-- 11. work_reports
INSERT INTO work_reports (contract_id, talent_id, report_week, content, ai_risk_level, ai_risk_summary, sentiment_score) VALUES
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-03',
     '이번 주는 AS-IS 아키텍처 분석을 완료하고 인증 서비스 API 설계를 마쳤습니다. 팀과의 협업이 원활하며 일정에 맞게 진행 중입니다.',
     'LOW','진행 상황 양호. 특이 사항 없음.',0.82),
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001','2026-03-10',
     '결제 서비스 PG사 연동 과정에서 예상치 못한 API 스펙 변경 이슈가 발생했습니다. 3일치 추가 작업이 필요하며 1주 지연이 예상됩니다. 야간 작업 중.',
     'HIGH','일정 지연 1주 예상. 과도한 야간 근무(18h/주) 감지. PM 즉시 확인 필요.',-0.34);

-- 12. evaluations
INSERT INTO evaluations (contract_id, evaluator_id, evaluator_role, raw_feedback, structured_feedback, trust_score) VALUES
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0000-000000000002','PM',
     'MSA 아키텍처 설계에 탁월한 역량. 커뮤니케이션 명확하고 문서화 훌륭. 돌발 상황 시 사전 보고가 조금 늦는 경향.',
     '{"communicationScore":4,"technicalScore":5,"scheduleScore":4,"strengths":["MSA 설계","문서화","코드 품질"],"improvements":["사전 리스크 보고 개선"],"overallComment":"재계약 적극 추천"}',
     88.50);

-- 13. settlements
INSERT INTO settlements (contract_id, talent_id, settlement_month, total_hours, unit_price, gross_amount, deduction, net_amount, status, approved_by, approved_at) VALUES
    ('00000000-0000-0000-0005-000000000001','00000000-0000-0000-0002-000000000001',
     '2026-03-01',80.00,50000.00,4000000.00,0.00,4000000.00,
     'APPROVED','00000000-0000-0000-0000-000000000004','2026-04-05 10:00:00+09');

-- 14. score_history
INSERT INTO score_history (talent_id, score_type, before_value, after_value, reason) VALUES
    ('00000000-0000-0000-0002-000000000001','SKILL',       80.00,85.00,'금융 플랫폼 MSA 전환 PM 평가 반영 (technicalScore=5)'),
    ('00000000-0000-0000-0002-000000000001','RELIABILITY', 85.00,88.00,'3개월 연속 무결근 및 납기 준수'),
    ('00000000-0000-0000-0002-000000000001','BONUS',        3.00, 5.00,'GitHub 분석 자가 증명 — 오픈소스 기여 34 repos, star 1,240');

-- 15. verification_logs
INSERT INTO verification_logs (experience_id, verification_type, source, result, detail) VALUES
    ('00000000-0000-0000-0007-000000000001','PROJECT_EXISTENCE','GitHub','PASSED', '{"repoUrl":"https://github.com/example/fintech-msa","stars":42,"commits":384,"verified":true}'),
    ('00000000-0000-0000-0007-000000000002','PROJECT_EXISTENCE','GitHub','FAILED', '{"repoUrl":null,"reason":"GitHub 저장소 미확인. 사내 프로젝트로 추정.","verified":false}');

-- 16. peer_reviews
INSERT INTO peer_reviews (talent_id, reviewer_id, contract_id, collaboration_score, technical_score, reliability_score, comment, is_anonymous) VALUES
    ('00000000-0000-0000-0002-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0005-000000000001',5,5,4,'기술적으로 매우 뛰어나고 협업 태도가 훌륭합니다. 문서화를 철저히 해주어 팀 생산성 향상에 기여했습니다.',TRUE),
    ('00000000-0000-0000-0002-000000000004','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0005-000000000002',4,4,3,'UI 구현 퀄리티가 높고 디자인 시스템을 잘 이해합니다. 일정 커뮤니케이션 개선이 필요합니다.',TRUE);

-- 17. self_certifications
INSERT INTO self_certifications (talent_id, source_type, source_url, analysis_result, bonus_score) VALUES
    ('00000000-0000-0000-0002-000000000001','GITHUB','https://github.com/kim-injae',
     '{"publicRepos":34,"totalStars":1240,"recentCommits":428,"topLanguages":["Java","Kotlin","Python"],"activityLevel":"HIGH","openSourceContributor":true,"summary":"활발한 오픈소스 기여자. Spring 관련 라이브러리 3개 메인테이너."}',
     5.00);

-- 18. notifications
INSERT INTO notifications (user_id, type, channel, title, body, is_read, sent_at, status) VALUES
    ('00000000-0000-0000-0000-000000000006','PROPOSAL',           'IN_APP','새 매칭 제안이 도착했습니다',          '금융 플랫폼 MSA 전환 프로젝트에 AI 매칭 제안이 생성되었습니다.',                       TRUE, '2026-03-20 09:00:00+09','SENT'),
    ('00000000-0000-0000-0000-000000000002','RISK_ALERT',         'IN_APP','[HIGH 리스크] 김인재 님 업무 보고 주의','3월 2주차 보고에서 HIGH 리스크 감지. 일정 지연 1주, 야간 근무 18h/주.',            FALSE,'2026-03-16 08:30:00+09','SENT'),
    ('00000000-0000-0000-0000-000000000006','TIMESHEET_APPROVED', 'IN_APP','타임시트가 승인되었습니다',              '2026년 3월 1주차(03-03~03-07) 타임시트가 PM에 의해 승인되었습니다.',                TRUE, '2026-03-08 18:30:00+09','SENT'),
    ('00000000-0000-0000-0000-000000000006','SETTLEMENT_PAID',    'IN_APP','3월 정산이 승인되었습니다',              '2026년 3월 정산 4,000,000원이 승인되었습니다. 입금 예정일: 2026-04-10.',           FALSE,'2026-04-05 10:30:00+09','SENT'),
    ('00000000-0000-0000-0000-000000000004','CONTRACT',           'IN_APP','계약이 서명 완료되었습니다',             '금융 플랫폼 MSA 전환 계약이 서명 완료되었습니다.',                                  TRUE, '2026-04-01 10:30:00+09','SENT');

-- 19. audit_logs
INSERT INTO audit_logs (actor_id, action, target_type, target_id, after_data, ip_address) VALUES
    ('00000000-0000-0000-0000-000000000004','CONTRACT_SIGN',     'contracts','00000000-0000-0000-0005-000000000001','{"status":"SIGNED","signedAt":"2026-04-01T10:00:00+09:00"}','203.248.100.1'),
    ('00000000-0000-0000-0000-000000000004','SETTLEMENT_APPROVE','settlements',NULL,                                '{"month":"2026-03","netAmount":4000000,"status":"APPROVED"}','203.248.100.1'),
    ('00000000-0000-0000-0000-000000000001','SCORE_UPDATE',      'talent_profiles','00000000-0000-0000-0002-000000000001','{"scoreType":"SKILL","before":80.00,"after":85.00}','10.0.0.1');

-- 20. ai_jobs
INSERT INTO ai_jobs (type, status, talent_id, payload, result) VALUES
    ('RESUME_PARSE',      'DONE','00000000-0000-0000-0002-000000000001','{"fileKey":"resumes/tp1/resume.pdf"}',       '{"parsedSkills":["Java","Spring Boot","MSA","Kubernetes"],"yearsOfExperience":10}'),
    ('SCORE_RECALCULATE', 'DONE','00000000-0000-0000-0002-000000000001','{"trigger":"EVALUATION_SUBMITTED"}',         '{"previousScore":83.4,"newScore":87.6}');

COMMIT;

-- 결과 확인
SELECT tbl, cnt FROM (
    SELECT 'users'             tbl, COUNT(*) cnt FROM users             UNION ALL
    SELECT 'partner_companies',      COUNT(*) FROM partner_companies    UNION ALL
    SELECT 'talent_profiles',        COUNT(*) FROM talent_profiles      UNION ALL
    SELECT 'talent_skills',          COUNT(*) FROM talent_skills        UNION ALL
    SELECT 'talent_experiences',     COUNT(*) FROM talent_experiences   UNION ALL
    SELECT 'project_opportunities',  COUNT(*) FROM project_opportunities UNION ALL
    SELECT 'match_proposals',        COUNT(*) FROM match_proposals      UNION ALL
    SELECT 'interview_records',      COUNT(*) FROM interview_records    UNION ALL
    SELECT 'contracts',              COUNT(*) FROM contracts            UNION ALL
    SELECT 'timesheets',             COUNT(*) FROM timesheets           UNION ALL
    SELECT 'work_reports',           COUNT(*) FROM work_reports         UNION ALL
    SELECT 'evaluations',            COUNT(*) FROM evaluations          UNION ALL
    SELECT 'settlements',            COUNT(*) FROM settlements          UNION ALL
    SELECT 'score_history',          COUNT(*) FROM score_history        UNION ALL
    SELECT 'verification_logs',      COUNT(*) FROM verification_logs    UNION ALL
    SELECT 'peer_reviews',           COUNT(*) FROM peer_reviews         UNION ALL
    SELECT 'self_certifications',    COUNT(*) FROM self_certifications  UNION ALL
    SELECT 'notifications',          COUNT(*) FROM notifications        UNION ALL
    SELECT 'audit_logs',             COUNT(*) FROM audit_logs           UNION ALL
    SELECT 'ai_jobs',                COUNT(*) FROM ai_jobs
) t ORDER BY tbl;
