-- @Enumerated(EnumType.STRING) 복귀 전 데이터 정합성 재보장 (멱등)
-- 잘못된 category 값은 DEVELOPER, 잘못된 field 값은 ETC로 정리한다.

UPDATE talent_profiles
SET category = 'DEVELOPER'
WHERE category IS NOT NULL
  AND category NOT IN ('DEVELOPER','ARCHITECT','DATA','SECURITY','PM','DESIGNER');

UPDATE talent_profiles
SET field = 'ETC'
WHERE field IS NOT NULL
  AND field NOT IN (
    'FRONTEND','BACKEND','FULLSTACK','MOBILE','EMBEDDED',
    'EA','TA_SYSTEM','TA_NETWORK','TA_CLOUD','AA','SA','DA',
    'DBA_RDBMS','DBA_NOSQL','DATA_ENGINEER','DATA_ANALYST','ML_ENGINEER',
    'ISMS','NETWORK_SEC','APP_SEC','CLOUD_SEC','PENTEST',
    'PROJECT_MGR','PMO','QA',
    'UX_PLANNER','UI_DESIGNER',
    'ETC'
  );

-- secondary_fields 테이블도 동일하게 정리
UPDATE talent_secondary_fields
SET field = 'ETC'
WHERE field NOT IN (
    'FRONTEND','BACKEND','FULLSTACK','MOBILE','EMBEDDED',
    'EA','TA_SYSTEM','TA_NETWORK','TA_CLOUD','AA','SA','DA',
    'DBA_RDBMS','DBA_NOSQL','DATA_ENGINEER','DATA_ANALYST','ML_ENGINEER',
    'ISMS','NETWORK_SEC','APP_SEC','CLOUD_SEC','PENTEST',
    'PROJECT_MGR','PMO','QA',
    'UX_PLANNER','UI_DESIGNER',
    'ETC'
  );
