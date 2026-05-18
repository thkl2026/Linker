-- Convert project_opportunities string columns from bytea to varchar if they were
-- created with wrong types (can happen if Hibernate DDL ran before Flyway).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'project_opportunities'
          AND column_name  = 'title'
          AND data_type    = 'bytea'
    ) THEN
        ALTER TABLE public.project_opportunities
            ALTER COLUMN title           TYPE VARCHAR(255) USING encode(title,           'escape'),
            ALTER COLUMN client_company  TYPE VARCHAR(200) USING encode(client_company,  'escape'),
            ALTER COLUMN main_contractor TYPE VARCHAR(200) USING encode(main_contractor, 'escape');
    END IF;
END $$;
