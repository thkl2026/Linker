-- ============================================================
-- V44__add_given_up_to_project_members.sql
-- 목적  : 추천 멤버 포기(Given Up) 상태 기록 컬럼 추가
-- 관련  : 00_ground_rules.md Rule 4 (Flyway 버전 관리)
-- 작성일: 2026-06-29
-- ============================================================

ALTER TABLE project_members
    ADD COLUMN IF NOT EXISTS given_up     BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS given_up_at  TIMESTAMPTZ;
