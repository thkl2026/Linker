-- ============================================================
-- seed_data.sql
-- 목적  : 개발·데모 환경 초기 데이터 삽입
-- 실행  : psql -U linker -d linker -f seed_data.sql
-- 주의  : 프로덕션 DB에 절대 실행 금지
--         email/phone 컬럼은 개발 편의상 평문 저장 (운영 시 AES-256-GCM 암호화)
-- ============================================================

BEGIN;

-- ──────────────────────────────────────────────────────────────
-- 0. 기존 데이터 초기화 (의존 역순)
-- ──────────────────────────────────────────────────────────────
TRUNCATE TABLE
    audit_logs,
    chat_histories,
    notifications,
    device_tokens,
    self_certifications,
    peer_reviews,
    score_history,
    verification_logs,
    evaluations,
    work_reports,
    timesheets,
    settlements,
    interview_records,
    match_proposals,
    contracts,
    ai_jobs,
    talent_experiences,
    talent_skills,
    talent_profiles,
    project_opportunities,
    partner_companies,
    identity_verifications,
    users
CASCADE;

-- ──────────────────────────────────────────────────────────────
-- 1. users  (10명: ADMIN×1, PM×2, PROCUREMENT×2, TALENT×5)
-- ──────────────────────────────────────────────────────────────
INSERT INTO users (id, email, email_hash, role, is_active, identity_verified, mfa_enabled)
VALUES
    -- ADMIN
    ('00000000-0000-0000-0000-000000000001',
     'admin@linker.co.kr',
     'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60001',
     'ADMIN', TRUE, TRUE, FALSE),

    -- PM
    ('00000000-0000-0000-0000-000000000002',
     'pm.kim@linker.co.kr',
     'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60002',
     'PM', TRUE, TRUE, FALSE),

    ('00000000-0000-0000-0000-000000000003',
     'pm.lee@linker.co.kr',
     'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60003',
     'PM', TRUE, TRUE, FALSE),

    -- PROCUREMENT
    ('00000000-0000-0000-0000-000000000004',
     'proc.park@linker.co.kr',
     'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60004',
     'PROCUREMENT', TRUE, TRUE, FALSE),

    ('00000000-0000-0000-0000-000000000005',
     'proc.choi@linker.co.kr',
     'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60005',
     'PROCUREMENT', TRUE, TRUE, FALSE),

    -- TALENT
    ('00000000-0000-0000-0000-000000000006',
     'talent.kim@example.com',
     'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60006',
     'TALENT', TRUE, TRUE, FALSE),

    ('00000000-0000-0000-0000-000000000007',
     'talent.lee@example.com',
     'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60007',
     'TALENT', TRUE, TRUE, FALSE),

    ('00000000-0000-0000-0000-000000000008',
     'talent.park@example.com',
     'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60008',
     'TALENT', TRUE, TRUE, FALSE),

    ('00000000-0000-0000-0000-000000000009',
     'talent.choi@example.com',
     'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60009',
     'TALENT', TRUE, TRUE, FALSE),

    ('00000000-0000-0000-0000-000000000010',
     'talent.jung@example.com',
     'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f60010',
     'TALENT', TRUE, TRUE, FALSE);

-- ──────────────────────────────────────────────────────────────
-- 2. partner_companies
-- ──────────────────────────────────────────────────────────────
INSERT INTO partner_companies
    (id, name, business_number, contact_email, contact_phone, address, contract_grade, is_approved, approved_by, approved_at)
VALUES
    ('00000000-0000-0000-0001-000000000001',
     '링커소프트(주)', '123-45-67890',
     'contact@linkersoft.co.kr', '02-1234-5678',
     '서울특별시 강남구 테헤란로 100',
     'PREFERRED', TRUE,
     '00000000-0000-0000-0000-000000000001',
     '2025-01-15 09:00:00+09'),

    ('00000000-0000-0000-0001-000000000002',
     '넥스트테크(주)', '987-65-43210',
     'hr@nexttech.co.kr', '02-9876-5432',
     '서울특별시 마포구 월드컵북로 200',
     'STANDARD', TRUE,
     '00000000-0000-0000-0000-000000000001',
     '2025-03-20 09:00:00+09');

-- ──────────────────────────────────────────────────────────────
-- 3. talent_profiles  (total_score/is_new_talent은 GENERATED 컬럼)
-- ──────────────────────────────────────────────────────────────
INSERT INTO talent_profiles
    (id, user_id, company_id, name, email, email_hash,
     availability_status, available_from, desired_rate, work_type,
     skill_score, reliability_score, performance_score, bonus_score)
VALUES
    -- 김인재: Java/Spring 10년, 링커소프트 소속
    ('00000000-0000-0000-0002-000000000001',
     '00000000-0000-0000-0000-000000000006',
     '00000000-0000-0000-0001-000000000001',
     '김인재', 'talent.kim@example.com',
     'b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a60001',
     'BUSY', '2026-06-01', 6000000, 'HYBRID',
     85.00, 88.00, 82.00, 5.00),

    -- 이개발: React/Node.js 7년, 링커소프트 소속
    ('00000000-0000-0000-0002-000000000002',
     '00000000-0000-0000-0000-000000000007',
     '00000000-0000-0000-0001-000000000001',
     '이개발', 'talent.lee@example.com',
     'b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a60002',
     'AVAILABLE', '2026-05-01', 5500000, 'REMOTE',
     78.00, 75.00, 70.00, 3.00),

    -- 박서버: Python/ML 5년, 넥스트테크 소속
    ('00000000-0000-0000-0002-000000000003',
     '00000000-0000-0000-0000-000000000008',
     '00000000-0000-0000-0001-000000000002',
     '박서버', 'talent.park@example.com',
     'b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a60003',
     'AVAILABLE', '2026-05-15', 5800000, 'REMOTE',
     82.00, 80.00, 75.00, 4.00),

    -- 최프론트: Vue/React 6년, 넥스트테크 소속
    ('00000000-0000-0000-0002-000000000004',
     '00000000-0000-0000-0000-000000000009',
     '00000000-0000-0000-0001-000000000002',
     '최프론트', 'talent.choi@example.com',
     'b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a60004',
     'BUSY', '2026-07-01', 5200000, 'HYBRID',
     76.00, 72.00, 68.00, 2.00),

    -- 정클라우드: AWS/DevOps 8년, 링커소프트 소속
    ('00000000-0000-0000-0002-000000000005',
     '00000000-0000-0000-0000-000000000010',
     '00000000-0000-0000-0001-000000000001',
     '정클라우드', 'talent.jung@example.com',
     'b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a6b1c2d3e4f5a60005',
     'AVAILABLE', '2026-05-01', 6500000, 'REMOTE',
     90.00, 85.00, 80.00, 6.00);

-- ──────────────────────────────────────────────────────────────
-- 4. talent_skills
-- ──────────────────────────────────────────────────────────────
INSERT INTO talent_skills (talent_id, skill_name, level, years) VALUES
    -- 김인재
    ('00000000-0000-0000-0002-000000000001', 'Java',          'EXPERT', 10),
    ('00000000-0000-0000-0002-000000000001', 'Spring Boot',   'EXPERT', 8),
    ('00000000-0000-0000-0002-000000000001', 'MSA',           'SENIOR', 5),
    ('00000000-0000-0000-0002-000000000001', 'Kubernetes',    'SENIOR', 4),
    ('00000000-0000-0000-0002-000000000001', 'PostgreSQL',    'SENIOR', 7),

    -- 이개발
    ('00000000-0000-0000-0002-000000000002', 'React',         'EXPERT', 7),
    ('00000000-0000-0000-0002-000000000002', 'TypeScript',    'SENIOR', 5),
    ('00000000-0000-0000-0002-000000000002', 'Node.js',       'SENIOR', 6),
    ('00000000-0000-0000-0002-000000000002', 'Next.js',       'MID',    3),

    -- 박서버
    ('00000000-0000-0000-0002-000000000003', 'Python',        'EXPERT', 8),
    ('00000000-0000-0000-0002-000000000003', 'PyTorch',       'SENIOR', 4),
    ('00000000-0000-0000-0002-000000000003', 'Airflow',       'SENIOR', 3),
    ('00000000-0000-0000-0002-000000000003', 'Spark',         'MID',    2),

    -- 최프론트
    ('00000000-0000-0000-0002-000000000004', 'Vue.js',        'EXPERT', 6),
    ('00000000-0000-0000-0002-000000000004', 'React',         'SENIOR', 4),
    ('00000000-0000-0000-0002-000000000004', 'JavaScript',    'EXPERT', 8),
    ('00000000-0000-0000-0002-000000000004', 'CSS/Tailwind',  'SENIOR', 5),

    -- 정클라우드
    ('00000000-0000-0000-0002-000000000005', 'AWS',           'EXPERT', 8),
    ('00000000-0000-0000-0002-000000000005', 'Terraform',     'EXPERT', 6),
    ('00000000-0000-0000-0002-000000000005', 'Docker',        'EXPERT', 7),
    ('00000000-0000-0000-0002-000000000005', 'CI/CD',         'EXPERT', 6),
    ('00000000-0000-0000-0002-000000000005', 'Kubernetes',    'SENIOR', 5);

-- ──────────────────────────────────────────────────────────────
-- 5. talent_experiences
-- ──────────────────────────────────────────────────────────────
INSERT INTO talent_experiences
    (id, talent_id, company_name, project_name, role, start_date, end_date,
     description, tech_stack, is_verified, verification_status)
VALUES
    -- 김인재 경력 1: 핀테크 백엔드
    ('00000000-0000-0000-0007-000000000001',
     '00000000-0000-0000-0002-000000000001',
     '(주)한국핀테크', '간편결제 플랫폼 구축',
     '백엔드 개발 리드',
     '2022-03-01', '2024-12-31',
     'MSA 기반 간편결제 플랫폼 설계·구현. 일 거래 300만건 처리 시스템.',
     '["Java", "Spring Boot", "Kafka", "Redis", "PostgreSQL", "Kubernetes"]',
     TRUE, 'VERIFIED'),

    -- 김인재 경력 2: 보험 레거시 전환
    ('00000000-0000-0000-0007-000000000002',
     '00000000-0000-0000-0002-000000000001',
     '대한화재보험(주)', '레거시 시스템 MSA 전환',
     '아키텍처 설계',
     '2020-01-01', '2022-02-28',
     '모놀리식 Java 레거시를 12개 MSA로 분리. 다운타임 0 달성.',
     '["Java", "Spring Cloud", "MySQL", "RabbitMQ"]',
     FALSE, 'UNKNOWN'),

    -- 박서버 경력: ML 파이프라인
    ('00000000-0000-0000-0007-000000000003',
     '00000000-0000-0000-0002-000000000003',
     '데이터클라우드(주)', '실시간 추천 엔진 개발',
     '머신러닝 엔지니어',
     '2023-06-01', '2025-12-31',
     'Airflow + Spark 기반 일 1TB 데이터 파이프라인. 추천 정확도 34% 향상.',
     '["Python", "PyTorch", "Airflow", "Spark", "AWS S3", "Redis"]',
     TRUE, 'VERIFIED'),

    -- 정클라우드 경력: 클라우드 인프라
    ('00000000-0000-0000-0007-000000000004',
     '00000000-0000-0000-0002-000000000005',
     '글로벌클라우드(주)', 'AWS 클라우드 전환 프로젝트',
     'DevOps 리드',
     '2021-03-01', '2025-06-30',
     'On-premise → AWS 전환. 인프라 비용 42% 절감, 배포 주기 2주→1일.',
     '["AWS", "Terraform", "Docker", "Kubernetes", "GitHub Actions"]',
     TRUE, 'VERIFIED');

-- ──────────────────────────────────────────────────────────────
-- 6. project_opportunities
-- ──────────────────────────────────────────────────────────────
INSERT INTO project_opportunities
    (id, title, description, required_skills, budget_min, budget_max,
     start_date, end_date, work_type, pm_id, status)
VALUES
    ('00000000-0000-0000-0003-000000000001',
     '금융 플랫폼 MSA 전환',
     '모놀리식 Java 금융 시스템을 12개 마이크로서비스로 분리 전환. '
     'API Gateway 구성, 이벤트 드리븐 아키텍처 설계 포함.',
     '["Java", "Spring Boot", "MSA", "Kubernetes", "Kafka"]',
     5000000, 8000000,
     '2026-04-01', '2027-03-31',
     'HYBRID',
     '00000000-0000-0000-0000-000000000002',
     'MATCHED'),

    ('00000000-0000-0000-0003-000000000002',
     '이커머스 모바일 프론트엔드 고도화',
     'React Native → Next.js 웹 앱 전환 및 UI/UX 개선. '
     '성능 최적화 (LCP 2.5초 이내), 다크모드 지원.',
     '["React", "Next.js", "TypeScript", "Tailwind CSS"]',
     4000000, 6500000,
     '2026-05-01', '2026-12-31',
     'REMOTE',
     '00000000-0000-0000-0000-000000000003',
     'OPEN'),

    ('00000000-0000-0000-0003-000000000003',
     'ML 데이터 파이프라인 구축',
     '실시간 사용자 행동 데이터 수집→정제→모델 학습 자동화 파이프라인. '
     '일 2TB 데이터 처리, Airflow DAG 설계.',
     '["Python", "Airflow", "Spark", "PyTorch", "AWS"]',
     5500000, 9000000,
     '2026-06-01', '2027-05-31',
     'REMOTE',
     '00000000-0000-0000-0000-000000000002',
     'OPEN');

-- ──────────────────────────────────────────────────────────────
-- 7. match_proposals
-- ──────────────────────────────────────────────────────────────
INSERT INTO match_proposals
    (id, project_id, talent_id, similarity_score, match_reason,
     strengths, concerns, interview_guide, status)
VALUES
    -- 금융MSA ↔ 김인재 (ACCEPTED)
    ('00000000-0000-0000-0004-000000000001',
     '00000000-0000-0000-0003-000000000001',
     '00000000-0000-0000-0002-000000000001',
     0.9412,
     'Java/Spring Boot 10년 경력과 실제 MSA 전환 경험이 프로젝트 요구사항과 정확히 일치합니다. '
     '핀테크 도메인 경험으로 금융 규정 준수 구현에 강점이 있습니다.',
     '["Spring Boot 마이크로서비스 설계 전문성", "Kafka 이벤트 드리븐 패턴 경험", '
     '"금융 레거시 전환 성공 이력", "Kubernetes 운영 경험"]',
     '["신규 팀원 온보딩 경험 부족 가능성"]',
     '["MSA 전환 시 데이터 정합성 전략을 어떻게 수립하셨나요?", '
     '"Kafka vs RabbitMQ 선택 기준을 설명해 주세요.", '
     '"무중단 배포 전략 경험이 있으신가요?"]',
     'ACCEPTED'),

    -- 금융MSA ↔ 이개발 (PENDING)
    ('00000000-0000-0000-0004-000000000002',
     '00000000-0000-0000-0003-000000000001',
     '00000000-0000-0000-0002-000000000002',
     0.8834,
     'TypeScript/Node.js 기반 BFF 계층 구축에 적합합니다. '
     'Java 백엔드 경험은 부족하나 API 설계 능력이 우수합니다.',
     '["TypeScript 정적 타입 활용 능력", "REST API 설계 경험", "Node.js 성능 최적화"]',
     '["Java Spring 경험 없음", "MSA 운영 경험 미검증"]',
     '["Node.js로 MSA BFF를 구현한 경험이 있으신가요?", '
     '"Java 서비스와의 통신 패턴을 어떻게 설계하실 건가요?"]',
     'PENDING'),

    -- 이커머스 ↔ 최프론트 (ACCEPTED)
    ('00000000-0000-0000-0004-000000000003',
     '00000000-0000-0000-0003-000000000002',
     '00000000-0000-0000-0002-000000000004',
     0.9156,
     'Vue.js/React 전문가로 Next.js 마이그레이션 역량이 충분합니다. '
     'CSS/Tailwind 전문성으로 UI 고도화에 즉시 투입 가능합니다.',
     '["React/Vue.js 이중 전문성", "Tailwind CSS 고급 활용", "웹 성능 최적화 경험"]',
     '["Next.js App Router 실전 경험 미검증"]',
     '["React → Next.js 전환 시 SSR/SSG 전략을 어떻게 구분하시나요?", '
     '"Core Web Vitals 개선 경험을 구체적으로 설명해 주세요."]',
     'ACCEPTED'),

    -- 이커머스 ↔ 이개발 (PENDING)
    ('00000000-0000-0000-0004-000000000004',
     '00000000-0000-0000-0003-000000000002',
     '00000000-0000-0000-0002-000000000002',
     0.8721,
     'React + TypeScript 전문가로 프론트엔드 요구사항 충족 가능합니다.',
     '["React 전문성", "TypeScript 숙련도"]',
     '["Next.js 경험 제한적", "이커머스 도메인 경험 미검증"]',
     '["Next.js에서 장바구니 상태 관리 전략을 설명해 주세요."]',
     'PENDING'),

    -- ML파이프라인 ↔ 박서버 (PENDING)
    ('00000000-0000-0000-0004-000000000005',
     '00000000-0000-0000-0003-000000000003',
     '00000000-0000-0000-0002-000000000003',
     0.9023,
     'Airflow + Spark 기반 실제 대용량 파이프라인 운영 경험이 요구사항과 높게 일치합니다. '
     'PyTorch 경험으로 모델 학습 자동화까지 담당 가능합니다.',
     '["Airflow DAG 설계 실전 경험", "Spark 대용량 처리", "PyTorch 모델 학습 자동화"]',
     '["AWS Glue/SageMaker 경험 미검증"]',
     '["Airflow DAG 장애 복구 전략을 설명해 주세요.", '
     '"Spark 파티셔닝 튜닝 경험이 있으신가요?", '
     '"모델 드리프트 감지를 어떻게 구현하셨나요?"]',
     'PENDING');

-- ──────────────────────────────────────────────────────────────
-- 8. interview_records  (금융MSA ↔ 김인재 면접 완료)
-- ──────────────────────────────────────────────────────────────
INSERT INTO interview_records
    (id, proposal_id, scheduled_at, location, result, notes)
VALUES
    ('00000000-0000-0000-0006-000000000001',
     '00000000-0000-0000-0004-000000000001',
     '2026-03-25 14:00:00+09',
     'https://meet.google.com/linker-interview-001',
     'PASS',
     'MSA 설계 경험 풍부, 커뮤니케이션 우수. Kafka 심화 질문에 명확한 답변. 즉시 투입 가능.');

-- ──────────────────────────────────────────────────────────────
-- 9. contracts
-- ──────────────────────────────────────────────────────────────
INSERT INTO contracts
    (id, project_id, talent_id, procurement_id,
     unit_price, total_amount, contract_terms,
     ai_price_analysis, status, signed_at)
VALUES
    -- 금융MSA + 김인재 → SIGNED
    ('00000000-0000-0000-0005-000000000001',
     '00000000-0000-0000-0003-000000000001',
     '00000000-0000-0000-0002-000000000001',
     '00000000-0000-0000-0000-000000000004',
     50000.00,
     48000000.00,
     '월 160시간 기준. 초과 근무 시 시간당 동일 단가 적용. '
     '매월 말일 근무 확인 후 익월 10일 정산. 계약 기간 12개월.',
     '{"recommendation": "FAIR", "marketRange": {"min": 45000, "max": 60000}, '
     '"analysis": "시니어 Java/MSA 전문가 시장 단가 범위 내. 적정 수준.", '
     '"riskScore": 0.12}',
     'SIGNED',
     '2026-04-01 10:00:00+09'),

    -- 이커머스 + 최프론트 → DRAFT
    ('00000000-0000-0000-0005-000000000002',
     '00000000-0000-0000-0003-000000000002',
     '00000000-0000-0000-0002-000000000004',
     '00000000-0000-0000-0000-000000000005',
     45000.00,
     40320000.00,
     '월 160시간 기준. 원격 근무 기본. 주 1회 화상 스탠드업 참여 필수. '
     '계약 기간 8개월.',
     '{"recommendation": "FAIR", "marketRange": {"min": 40000, "max": 55000}, '
     '"analysis": "프론트엔드 시니어 시장 단가 적정.", "riskScore": 0.08}',
     'DRAFT',
     NULL);

-- ──────────────────────────────────────────────────────────────
-- 10. timesheets  (계약1 / 김인재 / 2026-03)
-- ──────────────────────────────────────────────────────────────
INSERT INTO timesheets
    (contract_id, talent_id, work_date, hours_worked, work_description,
     status, ai_anomaly_flag, approved_by, approved_at)
VALUES
    -- 1주차 (2026-03-03 ~ 03-07) — 전체 APPROVED
    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-03', 8.0, 'AS-IS 분석: 현행 모놀리식 아키텍처 문서화 및 분리 대상 서비스 도출',
     'APPROVED', FALSE, '00000000-0000-0000-0000-000000000002', '2026-03-08 18:00:00+09'),

    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-04', 8.0, 'API 설계: 인증 서비스 REST API 스펙 초안 작성',
     'APPROVED', FALSE, '00000000-0000-0000-0000-000000000002', '2026-03-08 18:00:00+09'),

    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-05', 8.0, 'DB 분리 전략: 인증 서비스 전용 PostgreSQL 스키마 설계',
     'APPROVED', FALSE, '00000000-0000-0000-0000-000000000002', '2026-03-08 18:00:00+09'),

    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-06', 8.0, '인증 서비스 구현: JWT 발급·검증·갱신 로직',
     'APPROVED', FALSE, '00000000-0000-0000-0000-000000000002', '2026-03-08 18:00:00+09'),

    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-07', 8.0, '단위 테스트 작성 및 코드 리뷰 반영',
     'APPROVED', FALSE, '00000000-0000-0000-0000-000000000002', '2026-03-08 18:00:00+09'),

    -- 2주차 (2026-03-10 ~ 03-14) — 전체 APPROVED
    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-10', 8.0, '계정 서비스 분리: 회원가입·프로필 관리 MSA 전환',
     'APPROVED', FALSE, '00000000-0000-0000-0000-000000000002', '2026-03-15 18:00:00+09'),

    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-11', 8.0, 'Kafka 이벤트 설계: 회원 이벤트 스키마 정의 및 토픽 구조',
     'APPROVED', FALSE, '00000000-0000-0000-0000-000000000002', '2026-03-15 18:00:00+09'),

    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-12', 8.0, 'Kafka Consumer 구현: 회원 이벤트 구독·처리 로직',
     'APPROVED', FALSE, '00000000-0000-0000-0000-000000000002', '2026-03-15 18:00:00+09'),

    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-13', 8.0, '통합 테스트: 인증 ↔ 계정 서비스 간 통신 검증',
     'APPROVED', FALSE, '00000000-0000-0000-0000-000000000002', '2026-03-15 18:00:00+09'),

    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-14', 8.0, '문서화: Confluence 아키텍처 결정 레코드(ADR) 작성',
     'APPROVED', FALSE, '00000000-0000-0000-0000-000000000002', '2026-03-15 18:00:00+09'),

    -- 3주차 (2026-03-17 ~ 03-18) — SUBMITTED (미승인)
    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-17', 8.0, '결제 서비스 도메인 분석 및 외부 PG사 연동 설계',
     'SUBMITTED', FALSE, NULL, NULL),

    -- 이상 근무 (11.5시간 → AI 이상 플래그)
    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-18', 11.5, '결제 서비스 긴급 장애 대응: PG사 콜백 처리 버그 수정 및 핫픽스 배포',
     'SUBMITTED', TRUE, NULL, NULL);

-- ──────────────────────────────────────────────────────────────
-- 11. work_reports  (계약1 / 김인재)
-- ──────────────────────────────────────────────────────────────
INSERT INTO work_reports
    (contract_id, talent_id, report_week, content, ai_risk_level, ai_risk_summary, sentiment_score)
VALUES
    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-03',
     '이번 주는 AS-IS 아키텍처 분석을 완료하고 인증 서비스 API 설계를 마쳤습니다. '
     '팀과의 협업이 원활하며 일정에 맞게 진행 중입니다. 다음 주는 인증 서비스 구현에 집중할 예정입니다.',
     'LOW', '진행 상황 양호. 특이 사항 없음.', 0.82),

    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0002-000000000001',
     '2026-03-10',
     '결제 서비스 PG사 연동 과정에서 예상치 못한 API 스펙 변경 이슈가 발생했습니다. '
     '3일치 추가 작업이 필요하며, 현재 일정보다 1주 지연이 예상됩니다. '
     '야간 작업을 통해 따라잡으려 했으나 18시간 초과 근무가 발생했습니다.',
     'HIGH',
     '일정 지연 1주 예상. 과도한 야간 근무(18h/주) 감지. PM 즉시 확인 필요.',
     -0.34);

-- ──────────────────────────────────────────────────────────────
-- 12. evaluations
-- ──────────────────────────────────────────────────────────────
INSERT INTO evaluations
    (contract_id, evaluator_id, evaluator_role, raw_feedback, structured_feedback, trust_score)
VALUES
    ('00000000-0000-0000-0005-000000000001',
     '00000000-0000-0000-0000-000000000002',
     'PM',
     '김인재 님은 MSA 아키텍처 설계에 탁월한 역량을 보여주셨습니다. '
     '커뮤니케이션이 명확하고 문서화 습관이 훌륭합니다. '
     '단, 돌발 상황 발생 시 사전 보고가 조금 늦어지는 경향이 있습니다.',
     '{"communicationScore": 4, "technicalScore": 5, "scheduleScore": 4, '
     '"strengths": ["MSA 설계 역량", "문서화 능력", "코드 품질"], '
     '"improvements": ["사전 리스크 보고 개선 필요"], '
     '"overallComment": "금융 도메인 MSA 전문가로 재계약 적극 추천"}',
     88.50);

-- ──────────────────────────────────────────────────────────────
-- 13. settlements  (계약1 / 2026-03 / APPROVED)
-- ──────────────────────────────────────────────────────────────
INSERT INTO settlements
    (contract_id, talent_id, settlement_month,
     total_hours, unit_price, gross_amount, deduction, net_amount,
     status, approved_by, approved_at)
VALUES
    ('00000000-0000-0000-0005-000000000001',
     '00000000-0000-0000-0002-000000000001',
     '2026-03-01',
     80.00,          -- 승인된 타임시트 합계 (10일 × 8h)
     50000.00,       -- 계약 단가 스냅샷
     4000000.00,     -- 80h × 50,000원
     0.00,
     4000000.00,
     'APPROVED',
     '00000000-0000-0000-0000-000000000004',
     '2026-04-05 10:00:00+09');

-- ──────────────────────────────────────────────────────────────
-- 14. score_history  (김인재 스코어 변동 이력)
-- ──────────────────────────────────────────────────────────────
INSERT INTO score_history (talent_id, score_type, before_value, after_value, reason)
VALUES
    ('00000000-0000-0000-0002-000000000001',
     'SKILL', 80.00, 85.00,
     '금융 플랫폼 MSA 전환 프로젝트 PM 평가 반영 (technicalScore=5)'),

    ('00000000-0000-0000-0002-000000000001',
     'RELIABILITY', 85.00, 88.00,
     '3개월 연속 무결근 및 납기 준수 이력 반영'),

    ('00000000-0000-0000-0002-000000000001',
     'BONUS', 3.00, 5.00,
     'GitHub 활동 분석 자가 증명 — 오픈소스 기여 34 repos, star 1,240');

-- ──────────────────────────────────────────────────────────────
-- 15. verification_logs
-- ──────────────────────────────────────────────────────────────
INSERT INTO verification_logs
    (experience_id, verification_type, source, result, detail)
VALUES
    -- 김인재 핀테크 경력 → 검증 통과
    ('00000000-0000-0000-0007-000000000001',
     'PROJECT_EXISTENCE', 'GitHub',
     'PASSED',
     '{"repoUrl": "https://github.com/example/fintech-msa", '
     '"stars": 42, "commits": 384, "verified": true}'),

    -- 김인재 보험 레거시 경력 → 저장소 없음으로 검증 실패
    ('00000000-0000-0000-0007-000000000002',
     'PROJECT_EXISTENCE', 'GitHub',
     'FAILED',
     '{"repoUrl": null, "reason": "GitHub 저장소 미확인. 사내 프로젝트로 추정.", '
     '"verified": false}');

-- ──────────────────────────────────────────────────────────────
-- 16. peer_reviews
-- ──────────────────────────────────────────────────────────────
INSERT INTO peer_reviews
    (talent_id, reviewer_id, contract_id,
     collaboration_score, technical_score, reliability_score,
     comment, is_anonymous)
VALUES
    -- PM1이 김인재를 평가 (익명)
    ('00000000-0000-0000-0002-000000000001',
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0005-000000000001',
     5, 5, 4,
     '기술적으로 매우 뛰어나고 협업 태도가 훌륭합니다. '
     '문서화를 철저히 해주어 팀 전체의 생산성 향상에 기여했습니다.',
     TRUE),

    -- PM2가 최프론트를 평가 (익명)
    ('00000000-0000-0000-0002-000000000004',
     '00000000-0000-0000-0000-000000000003',
     '00000000-0000-0000-0005-000000000002',
     4, 4, 3,
     'UI 구현 퀄리티가 높고 디자인 시스템을 잘 이해합니다. '
     '일정 관리 측면에서 조금 더 적극적인 커뮤니케이션이 필요합니다.',
     TRUE);

-- ──────────────────────────────────────────────────────────────
-- 17. self_certifications  (김인재 GitHub 분석)
-- ──────────────────────────────────────────────────────────────
INSERT INTO self_certifications
    (talent_id, source_type, source_url, analysis_result, bonus_score)
VALUES
    ('00000000-0000-0000-0002-000000000001',
     'GITHUB',
     'https://github.com/kim-injae',
     '{"publicRepos": 34, "totalStars": 1240, "recentCommits": 428, '
     '"topLanguages": ["Java", "Kotlin", "Python"], '
     '"activityLevel": "HIGH", "openSourceContributor": true, '
     '"summary": "활발한 오픈소스 기여자. Spring 관련 라이브러리 3개 메인테이너."}',
     5.00);

-- ──────────────────────────────────────────────────────────────
-- 18. notifications
-- ──────────────────────────────────────────────────────────────
INSERT INTO notifications (user_id, type, channel, title, body, is_read, sent_at, status)
VALUES
    -- 김인재: 매칭 제안 수신
    ('00000000-0000-0000-0000-000000000006',
     'PROPOSAL', 'IN_APP',
     '새 매칭 제안이 도착했습니다',
     '금융 플랫폼 MSA 전환 프로젝트에 AI 매칭 제안이 생성되었습니다. 확인해 보세요.',
     TRUE, '2026-03-20 09:00:00+09', 'SENT'),

    -- PM 김성준: 리스크 알림
    ('00000000-0000-0000-0000-000000000002',
     'RISK_ALERT', 'IN_APP',
     '[HIGH 리스크] 김인재 님 업무 보고 주의',
     '3월 2주차 업무 보고에서 HIGH 리스크가 감지되었습니다. '
     '일정 지연 1주 예상, 과도한 야간 근무(18h/주) 감지.',
     FALSE, '2026-03-16 08:30:00+09', 'SENT'),

    -- 김인재: 타임시트 승인
    ('00000000-0000-0000-0000-000000000006',
     'TIMESHEET_APPROVED', 'IN_APP',
     '타임시트가 승인되었습니다',
     '2026년 3월 1주차(03-03 ~ 03-07) 타임시트가 PM에 의해 승인되었습니다.',
     TRUE, '2026-03-08 18:30:00+09', 'SENT'),

    -- 김인재: 정산 완료
    ('00000000-0000-0000-0000-000000000006',
     'SETTLEMENT_PAID', 'IN_APP',
     '3월 정산이 승인되었습니다',
     '2026년 3월 정산 4,000,000원이 승인되었습니다. 입금 예정일: 2026-04-10.',
     FALSE, '2026-04-05 10:30:00+09', 'SENT'),

    -- 구매담당자 박수현: 계약 서명 완료
    ('00000000-0000-0000-0000-000000000004',
     'CONTRACT', 'IN_APP',
     '계약이 서명 완료되었습니다',
     '금융 플랫폼 MSA 전환 프로젝트 계약이 서명 완료되었습니다. PDF를 확인하세요.',
     TRUE, '2026-04-01 10:30:00+09', 'SENT');

-- ──────────────────────────────────────────────────────────────
-- 19. audit_logs
-- ──────────────────────────────────────────────────────────────
INSERT INTO audit_logs
    (actor_id, action, target_type, target_id, after_data, ip_address)
VALUES
    ('00000000-0000-0000-0000-000000000004',
     'CONTRACT_SIGN',
     'contracts',
     '00000000-0000-0000-0005-000000000001',
     '{"contractId": "00000000-0000-0000-0005-000000000001", "status": "SIGNED", '
     '"signedAt": "2026-04-01T10:00:00+09:00"}',
     '203.248.100.1'),

    ('00000000-0000-0000-0000-000000000004',
     'SETTLEMENT_APPROVE',
     'settlements',
     NULL,
     '{"contractId": "00000000-0000-0000-0005-000000000001", '
     '"month": "2026-03", "netAmount": 4000000, "status": "APPROVED"}',
     '203.248.100.1'),

    ('00000000-0000-0000-0000-000000000001',
     'SCORE_UPDATE',
     'talent_profiles',
     '00000000-0000-0000-0002-000000000001',
     '{"talentId": "00000000-0000-0000-0002-000000000001", '
     '"scoreType": "SKILL", "before": 80.00, "after": 85.00}',
     '10.0.0.1');

-- ──────────────────────────────────────────────────────────────
-- 20. ai_jobs  (완료된 임베딩 작업)
-- ──────────────────────────────────────────────────────────────
INSERT INTO ai_jobs (type, status, talent_id, payload, result)
VALUES
    ('RESUME_PARSE', 'DONE',
     '00000000-0000-0000-0002-000000000001',
     '{"fileKey": "resumes/00000000-0000-0000-0002-000000000001/resume.pdf"}',
     '{"parsedSkills": ["Java", "Spring Boot", "MSA", "Kubernetes"], '
     '"yearsOfExperience": 10, "educationLevel": "BACHELOR"}'),

    ('SCORE_RECALCULATE', 'DONE',
     '00000000-0000-0000-0002-000000000001',
     '{"trigger": "EVALUATION_SUBMITTED"}',
     '{"previousScore": 83.4, "newScore": 87.6}');

COMMIT;

-- 결과 확인
SELECT 'users'              AS tbl, COUNT(*) AS cnt FROM users
UNION ALL SELECT 'partner_companies',      COUNT(*) FROM partner_companies
UNION ALL SELECT 'talent_profiles',        COUNT(*) FROM talent_profiles
UNION ALL SELECT 'talent_skills',          COUNT(*) FROM talent_skills
UNION ALL SELECT 'talent_experiences',     COUNT(*) FROM talent_experiences
UNION ALL SELECT 'project_opportunities',  COUNT(*) FROM project_opportunities
UNION ALL SELECT 'match_proposals',        COUNT(*) FROM match_proposals
UNION ALL SELECT 'interview_records',      COUNT(*) FROM interview_records
UNION ALL SELECT 'contracts',              COUNT(*) FROM contracts
UNION ALL SELECT 'timesheets',             COUNT(*) FROM timesheets
UNION ALL SELECT 'work_reports',           COUNT(*) FROM work_reports
UNION ALL SELECT 'evaluations',            COUNT(*) FROM evaluations
UNION ALL SELECT 'settlements',            COUNT(*) FROM settlements
UNION ALL SELECT 'score_history',          COUNT(*) FROM score_history
UNION ALL SELECT 'verification_logs',      COUNT(*) FROM verification_logs
UNION ALL SELECT 'peer_reviews',           COUNT(*) FROM peer_reviews
UNION ALL SELECT 'self_certifications',    COUNT(*) FROM self_certifications
UNION ALL SELECT 'notifications',          COUNT(*) FROM notifications
UNION ALL SELECT 'audit_logs',             COUNT(*) FROM audit_logs
UNION ALL SELECT 'ai_jobs',                COUNT(*) FROM ai_jobs
ORDER BY tbl;
