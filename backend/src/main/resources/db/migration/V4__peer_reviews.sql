-- ============================================================
-- V4__peer_reviews.sql
-- 목적  : Phase 6 — 익명 다면 평가(Peer Review) 테이블 신규 생성
-- 작성일: 2026-04-19
-- 주의  : 이 파일은 절대 수정 금지. 변경 필요 시 V5 이상으로 신규 작성. (Rule 4)
-- ============================================================

-- ── peer_reviews — 익명 다면 평가 (F-4.5) ───────────────────────────────────
CREATE TABLE peer_reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id       UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    reviewer_id     UUID NOT NULL REFERENCES users(id),
    contract_id     UUID REFERENCES contracts(id),
    collaboration_score INT NOT NULL CHECK (collaboration_score BETWEEN 1 AND 5),
    technical_score     INT NOT NULL CHECK (technical_score BETWEEN 1 AND 5),
    reliability_score   INT NOT NULL CHECK (reliability_score BETWEEN 1 AND 5),
    comment         TEXT,
    is_anonymous    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (talent_id, reviewer_id, contract_id)   -- 계약당 1인 1회
);

CREATE INDEX idx_peer_reviews_talent ON peer_reviews (talent_id);
CREATE INDEX idx_peer_reviews_reviewer ON peer_reviews (reviewer_id);

-- ── self_certifications — 자가 증명 소스 이력 (F-1.7) ────────────────────────
CREATE TABLE self_certifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent_id       UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    source_type     VARCHAR(30) NOT NULL,    -- GITHUB | BLOG | OPENSOURCE
    source_url      VARCHAR(500) NOT NULL,
    analysis_result JSONB,                  -- { repos, stars, commits, languages, bonusScore }
    bonus_score     DECIMAL(5,2) DEFAULT 0 CHECK (bonus_score BETWEEN 0 AND 10),
    analyzed_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (talent_id, source_url)
);

CREATE INDEX idx_self_cert_talent ON self_certifications (talent_id);
