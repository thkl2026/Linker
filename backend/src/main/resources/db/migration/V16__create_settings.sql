CREATE TABLE platform_settings (
    key        VARCHAR(100) NOT NULL PRIMARY KEY,
    value      TEXT         NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (key, value) VALUES
    ('general.platformName',                'Linker (링커)'),
    ('general.contactPhone',               '02-1234-5678'),
    ('general.feeRate',                    '10'),
    ('evaluation.metrics',                 '[{"name":"기술 숙련도","icon":"🛠️","weight":40},{"name":"일정 준수","icon":"📅","weight":30},{"name":"소통 및 협업","icon":"💬","weight":30}]'),
    ('evaluation.gradeS',                  '4.8'),
    ('evaluation.gradeA',                  '4.5'),
    ('evaluation.gradeB',                  '3.5'),
    ('notification.evalReminderDays',      '3'),
    ('notification.evalReminderEnabled',   'true'),
    ('notification.urgentHours',           '48'),
    ('notification.urgentEnabled',         'true'),
    ('master.contractors',                 '["(주)링크소프트","(주)인포테크","에이치에스 시스템","대한정보"]'),
    ('master.techStacks',                  '["React","Java Spring","Python","TypeScript","Kotlin","Vue.js","Node.js","AWS","Docker","Kubernetes"]');

CREATE TABLE user_invitations (
    id          UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL,
    role        VARCHAR(50)  NOT NULL,
    status      VARCHAR(50)  NOT NULL DEFAULT 'PENDING',
    invited_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);
