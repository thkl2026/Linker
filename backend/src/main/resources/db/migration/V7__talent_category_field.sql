-- ============================================================
-- V7__talent_category_field.sql
-- 목적  : talent_profiles 에 직군 대분류(category) / 소분류(field) 컬럼 추가
-- 작성일: 2026-05-01
-- ============================================================

ALTER TABLE talent_profiles
    ADD COLUMN category VARCHAR(20),
    ADD COLUMN field    VARCHAR(30);

-- 검색 필터 및 AI 매칭에 사용될 복합 인덱스
CREATE INDEX idx_talent_category_field ON talent_profiles (category, field)
    WHERE deleted_at IS NULL;
