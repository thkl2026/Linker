-- V2__ai_pipeline.sql used CREATE TABLE IF NOT EXISTS for tables already created in V1,
-- so the new columns from V2 were silently skipped. This migration adds them.

ALTER TABLE match_proposals
    ADD COLUMN IF NOT EXISTS match_reason    TEXT,
    ADD COLUMN IF NOT EXISTS strengths       JSONB,
    ADD COLUMN IF NOT EXISTS concerns        JSONB,
    ADD COLUMN IF NOT EXISTS created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE match_proposals
    ALTER COLUMN interview_guide TYPE JSONB USING interview_guide::JSONB;

ALTER TABLE interview_records
    ADD COLUMN IF NOT EXISTS location    VARCHAR(255),
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
