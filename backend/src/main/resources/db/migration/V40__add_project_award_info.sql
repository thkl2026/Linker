ALTER TABLE project_opportunities ADD COLUMN IF NOT EXISTS award_status VARCHAR(20);
ALTER TABLE project_opportunities ADD COLUMN IF NOT EXISTS award_amount NUMERIC(15, 2);
ALTER TABLE project_opportunities ADD COLUMN IF NOT EXISTS contract_date DATE;
ALTER TABLE project_opportunities ADD COLUMN IF NOT EXISTS award_note TEXT;
ALTER TABLE project_opportunities ADD COLUMN IF NOT EXISTS contractor_contact VARCHAR(500);
