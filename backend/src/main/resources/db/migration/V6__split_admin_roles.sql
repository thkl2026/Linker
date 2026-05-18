-- 기존 ADMIN 역할을 SYSTEM_ADMIN으로 전환
UPDATE users SET role = 'SYSTEM_ADMIN' WHERE role = 'ADMIN';
