-- V34: users 테이블에 프로필 필드 추가
-- name: 사용자가 직접 설정하는 표시 이름 (KCB 실명과 별개)
-- position: 직책/직위 (선택)
ALTER TABLE users ADD COLUMN name VARCHAR(100);
ALTER TABLE users ADD COLUMN position VARCHAR(100);
