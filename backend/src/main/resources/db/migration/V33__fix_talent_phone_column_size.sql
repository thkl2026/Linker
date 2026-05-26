-- V33: talent_profiles.phone VARCHAR(30) → TEXT
-- AES-256-GCM 암호화 결과(≥56자)가 VARCHAR(30)에 저장 불가한 버그 수정
ALTER TABLE talent_profiles ALTER COLUMN phone TYPE TEXT;
