-- 타임시트 통합 테스트용 픽스처 데이터

-- 유저
INSERT INTO users (id, email, email_hash, role, is_active)
VALUES ('cccccccc-0000-0000-0000-000000000003',
        'proc2@test.com', 'proc_hash_2', 'PROCUREMENT', true);
INSERT INTO users (id, email, email_hash, role, is_active)
VALUES ('cccccccc-0000-0000-0000-000000000004',
        'talent2@test.com', 'talent_hash_2', 'TALENT', true);

-- 파트너사
INSERT INTO partner_companies (id, name, business_number, is_approved)
VALUES ('dddddddd-0000-0000-0000-000000000002', 'TestCo2', '987-65-43210', true);

-- 인력 프로필
INSERT INTO talent_profiles (id, user_id, company_id, name)
VALUES ('bbbbbbbb-0000-0000-0000-000000000002',
        'cccccccc-0000-0000-0000-000000000004',
        'dddddddd-0000-0000-0000-000000000002',
        'Test Talent 2');

-- 프로젝트
INSERT INTO project_opportunities (id, title, pm_id, status)
VALUES ('eeeeeeee-0000-0000-0000-000000000002',
        'Test Project 2', 'cccccccc-0000-0000-0000-000000000003', 'OPEN');

-- 계약
INSERT INTO contracts (id, project_id, talent_id, procurement_id, unit_price, total_amount, status)
VALUES ('aaaaaaaa-0000-0000-0000-000000000002',
        'eeeeeeee-0000-0000-0000-000000000002',
        'bbbbbbbb-0000-0000-0000-000000000002',
        'cccccccc-0000-0000-0000-000000000003',
        600000, 4800000, 'SIGNED');

-- 타임시트 3건: SUBMITTED 2건, APPROVED 1건, anomaly flag 1건
INSERT INTO timesheets (id, contract_id, talent_id, work_date, hours_worked, work_description, status, ai_anomaly_flag)
VALUES ('f1000000-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000002',
        'bbbbbbbb-0000-0000-0000-000000000002',
        '2026-04-10', 8.0, '백엔드 API 개발', 'SUBMITTED', false),
       ('f1000000-0000-0000-0000-000000000002',
        'aaaaaaaa-0000-0000-0000-000000000002',
        'bbbbbbbb-0000-0000-0000-000000000002',
        '2026-04-11', 11.5, '긴급 장애 대응', 'SUBMITTED', true),
       ('f1000000-0000-0000-0000-000000000003',
        'aaaaaaaa-0000-0000-0000-000000000002',
        'bbbbbbbb-0000-0000-0000-000000000002',
        '2026-04-09', 7.5, '코드 리뷰', 'APPROVED', false);
