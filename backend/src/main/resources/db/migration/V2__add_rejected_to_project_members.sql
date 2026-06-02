-- ============================================================
-- V2__add_rejected_to_project_members.sql
-- 목적  : 추천 멤버 탈락 결과 보존 — 삭제 없이 상태로 기록
-- 관련  : 00_ground_rules.md Rule 4 (Flyway 버전 관리)
-- 작성일: 2026-06-02
-- 주의  : 이 파일은 절대 수정 금지. 변경 필요 시 V3 이상으로 신규 작성.
-- ============================================================

ALTER TABLE project_members
    ADD COLUMN IF NOT EXISTS rejected     BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS rejected_at  TIMESTAMPTZ;
