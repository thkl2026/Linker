-- PLANNER 카테고리 처리 (V35에서 누락)
UPDATE talent_profiles
SET category = 'DESIGNER', field = 'UX_PLANNER'
WHERE category = 'PLANNER' AND field = 'UX_PLANNER';

UPDATE talent_profiles
SET category = 'DESIGNER', field = 'ETC'
WHERE category = 'PLANNER';

-- 잔여 구 field 값 정리 (SERVICE_PLANNER, PRODUCT_PLANNER)
UPDATE talent_profiles
SET field = 'ETC'
WHERE field IN ('SERVICE_PLANNER', 'PRODUCT_PLANNER');

-- DESIGNER 카테고리에 잘못된 field 값 정리
UPDATE talent_profiles
SET field = 'UX_PLANNER'
WHERE category = 'DESIGNER' AND field = 'UI_UX';

UPDATE talent_profiles
SET field = 'UI_DESIGNER'
WHERE category = 'DESIGNER' AND field = 'GRAPHIC';

-- 혹시 남아있을 수 있는 구 enum 값 일괄 ETC 처리
UPDATE talent_profiles
SET field = 'ETC'
WHERE field NOT IN (
    'FRONTEND','BACKEND','FULLSTACK','MOBILE','EMBEDDED',
    'EA','TA_SYSTEM','TA_NETWORK','TA_CLOUD','AA','SA','DA',
    'DBA_RDBMS','DBA_NOSQL','DATA_ENGINEER','DATA_ANALYST','ML_ENGINEER',
    'ISMS','NETWORK_SEC','APP_SEC','CLOUD_SEC','PENTEST',
    'PROJECT_MGR','PMO','QA',
    'UX_PLANNER','UI_DESIGNER',
    'ETC'
) AND field IS NOT NULL;

-- 혹시 남아있을 수 있는 구 category 값 일괄 처리
UPDATE talent_profiles
SET category = 'DEVELOPER'
WHERE category NOT IN ('DEVELOPER','ARCHITECT','DATA','SECURITY','PM','DESIGNER')
AND category IS NOT NULL;
