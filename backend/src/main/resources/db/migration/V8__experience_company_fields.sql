-- ============================================================
-- V8__experience_company_fields.sql
-- 목적  : talent_experiences 에 근무회사 구분 필드 추가
-- 작성일: 2026-05-01
-- ============================================================

ALTER TABLE talent_experiences
    ADD COLUMN experience_type  VARCHAR(20) NOT NULL DEFAULT 'PROJECT',
    ADD COLUMN department       VARCHAR(100),
    ADD COLUMN employment_type  VARCHAR(30);

CREATE INDEX idx_experience_type ON talent_experiences (talent_id, experience_type);
