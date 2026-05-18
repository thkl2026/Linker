-- ============================================================
-- V5__patch_missing_columns.sql
-- 목적  : full_setup.sql 기반 DB에 누락된 컬럼 보완
-- 대상  : interview_records.location
-- ============================================================

ALTER TABLE interview_records
    ADD COLUMN IF NOT EXISTS location VARCHAR(255);
