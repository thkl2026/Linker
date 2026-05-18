ALTER TABLE project_opportunities
    ADD COLUMN evaluation_score DECIMAL(5, 2),
    ADD COLUMN evaluated_at     TIMESTAMPTZ,
    ADD COLUMN evaluation_note  TEXT;
