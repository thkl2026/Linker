ALTER TABLE project_opportunities
    ADD COLUMN client_company    VARCHAR(200),
    ADD COLUMN main_contractor   VARCHAR(200),
    ADD COLUMN required_headcount INT NOT NULL DEFAULT 1;
