ALTER TABLE project_members
    ADD COLUMN IF NOT EXISTS proposed_price  DECIMAL(15,2),
    ADD COLUMN IF NOT EXISTS talent_salary   DECIMAL(15,2);
