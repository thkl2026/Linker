CREATE TABLE resume_analysis_logs (
    id UUID PRIMARY KEY,
    file_name VARCHAR(255),
    raw_content TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
