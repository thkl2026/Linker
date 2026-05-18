-- 정산 통합 테스트용 픽스처 데이터
-- AbstractIntegrationTest → SettlementRepositoryTest 에서 @Sql 로 주입

-- 유저 (PROCUREMENT 역할)
INSERT INTO users (id, email, email_hash, role, is_active)
VALUES ('cccccccc-0000-0000-0000-000000000001',
        'proc@test.com', 'proc_hash_1', 'PROCUREMENT', true);

-- 유저 (TALENT 역할)
INSERT INTO users (id, email, email_hash, role, is_active)
VALUES ('cccccccc-0000-0000-0000-000000000002',
        'talent@test.com', 'talent_hash_1', 'TALENT', true);

-- 파트너사
INSERT INTO partner_companies (id, name, business_number, is_approved)
VALUES ('dddddddd-0000-0000-0000-000000000001', 'TestCo', '123-45-67890', true);

-- 인력 프로필
INSERT INTO talent_profiles (id, user_id, company_id, name)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001',
        'cccccccc-0000-0000-0000-000000000002',
        'dddddddd-0000-0000-0000-000000000001',
        'Test Talent');

-- 프로젝트
INSERT INTO project_opportunities (id, title, pm_id, status)
VALUES ('eeeeeeee-0000-0000-0000-000000000001',
        'Test Project', 'cccccccc-0000-0000-0000-000000000001', 'OPEN');

-- 계약
INSERT INTO contracts (id, project_id, talent_id, procurement_id, unit_price, total_amount, status)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
        'eeeeeeee-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        'cccccccc-0000-0000-0000-000000000001',
        500000, 4000000, 'SIGNED');

-- 정산 2건 (3월, 4월)
INSERT INTO settlements (id, contract_id, talent_id, settlement_month,
                         total_hours, unit_price, gross_amount, deduction, net_amount, status)
VALUES ('f0000000-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        '2026-03-01', 80.00, 500000, 40000000, 0, 40000000, 'DRAFT'),
       ('f0000000-0000-0000-0000-000000000002',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'bbbbbbbb-0000-0000-0000-000000000001',
        '2026-02-01', 72.00, 500000, 36000000, 0, 36000000, 'APPROVED');
