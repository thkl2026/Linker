ALTER TABLE resume_analysis_logs
    ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_resume_log_file_hash ON resume_analysis_logs (file_hash);
