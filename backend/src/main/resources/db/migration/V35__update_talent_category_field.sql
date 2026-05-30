-- ── Category 변경 ─────────────────────────────────────────────────────────────
UPDATE talent_profiles SET category = 'DATA' WHERE category = 'DBA';
UPDATE talent_profiles SET category = 'DATA' WHERE category = 'ANALYST' AND field = 'DATA_ANALYST';
UPDATE talent_profiles SET category = 'PM',   field = 'ETC' WHERE category = 'ANALYST';

-- ── Field 변경 (ARCHITECT) ────────────────────────────────────────────────────
UPDATE talent_profiles SET field = 'SA'        WHERE field = 'SOLUTION_ARCHITECT';
UPDATE talent_profiles SET field = 'ETC'       WHERE field = 'TECHNICAL_ARCHITECT';
UPDATE talent_profiles SET field = 'AA'        WHERE field = 'APPLICATION_ARCHITECT';
UPDATE talent_profiles SET field = 'TA_CLOUD'  WHERE field = 'CLOUD_ARCHITECT';
UPDATE talent_profiles SET field = 'DA'        WHERE field = 'DATA_ARCHITECT';

-- ── Field 변경 (DATA) ─────────────────────────────────────────────────────────
UPDATE talent_profiles SET field = 'DBA_RDBMS' WHERE field = 'RDBMS';
UPDATE talent_profiles SET field = 'DBA_NOSQL' WHERE field = 'NOSQL';

-- ── Field 변경 (PM) ───────────────────────────────────────────────────────────
UPDATE talent_profiles SET field = 'PROJECT_MGR' WHERE field = 'PROJECT_MANAGER';
UPDATE talent_profiles SET field = 'ETC'         WHERE field = 'PRODUCT_OWNER';

-- ── Field 변경 (DEVELOPER) ────────────────────────────────────────────────────
UPDATE talent_profiles SET field = 'ETC' WHERE field = 'DEVOPS';

-- ── Field 변경 (DESIGNER) ─────────────────────────────────────────────────────
UPDATE talent_profiles SET field = 'UX_PLANNER'  WHERE field = 'UI_UX';
UPDATE talent_profiles SET field = 'UI_DESIGNER'  WHERE field = 'GRAPHIC';

-- ── 삭제된 분야 잔여분 ETC 처리 ───────────────────────────────────────────────
UPDATE talent_profiles SET field = 'ETC'
WHERE field IN ('BUSINESS_ANALYST', 'SERVICE_PLANNER', 'PRODUCT_PLANNER', 'UX_PLANNER_OLD');
