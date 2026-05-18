-- ============================================================
-- V2__ai_pipeline.sql
-- 목적  : Phase 2 AI 파이프라인 — 임베딩, AI 작업 상태, 매칭 제안, 인터뷰 레코드
-- 작성일: 2026-04-19
-- 주의  : 이 파일은 절대 수정 금지. 변경 필요 시 V3 이상으로 신규 작성. (Rule 4)
-- ============================================================

-- ── 1. talent_profiles — profile_embedding 컬럼 추가 ───────────────────────
ALTER TABLE talent_profiles
    ADD COLUMN IF NOT EXISTS profile_embedding vector(768),
    ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- HNSW 벡터 인덱스 (pgvector) — 코사인 유사도 기반 빠른 검색
CREATE INDEX IF NOT EXISTS idx_talent_embedding_hnsw
    ON talent_profiles USING hnsw (profile_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ── 2. ai_jobs — AI 비동기 작업 상태 추적 ─────────────────────────────────
CREATE TABLE ai_jobs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type         VARCHAR(30)  NOT NULL,       -- RESUME_PARSE | SCORE_RECALCULATE | ...
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',  -- PENDING | PROCESSING | DONE | FAILED
    talent_id    UUID REFERENCES talent_profiles(id) ON DELETE SET NULL,
    payload      JSONB,                        -- 작업 입력 데이터 (파일 키, 파라미터 등)
    result       JSONB,                        -- 처리 결과
    error_msg    TEXT,                         -- 실패 사유
    created_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_jobs_talent_id ON ai_jobs (talent_id);
CREATE INDEX idx_ai_jobs_status    ON ai_jobs (status) WHERE status IN ('PENDING', 'PROCESSING');

-- ── 3. match_proposals — AI 매칭 제안 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_proposals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES project_opportunities(id) ON DELETE CASCADE,
    talent_id       UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5,4),             -- 벡터 코사인 유사도 (0~1)
    match_reason    TEXT,                       -- AI 매칭 이유 (match-reason.st 출력)
    strengths       JSONB,                      -- 강점 목록
    concerns        JSONB,                      -- 우려사항 목록
    interview_guide JSONB,                      -- 인터뷰 질문 3개
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | ACCEPTED | REJECTED
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, talent_id)
);

CREATE INDEX idx_match_proposals_project  ON match_proposals (project_id);
CREATE INDEX idx_match_proposals_talent   ON match_proposals (talent_id);
CREATE INDEX idx_match_proposals_score    ON match_proposals (similarity_score DESC NULLS LAST);

-- ── 4. interview_records ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id     UUID NOT NULL REFERENCES match_proposals(id) ON DELETE CASCADE,
    scheduled_at    TIMESTAMPTZ,
    location        VARCHAR(255),               -- 화상회의 URL 또는 장소
    result          VARCHAR(20),                -- PASS | FAIL | PENDING
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interview_records_proposal ON interview_records (proposal_id);

-- ── 5. device_tokens — FCM 푸시 토큰 ────────────────────────────────────────
CREATE TABLE device_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token   VARCHAR(500) NOT NULL,
    platform    VARCHAR(10) NOT NULL,               -- IOS | ANDROID | WEB
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, fcm_token)
);

CREATE INDEX idx_device_tokens_user ON device_tokens (user_id);
