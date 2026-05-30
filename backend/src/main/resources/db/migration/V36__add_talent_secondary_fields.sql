CREATE TABLE talent_secondary_fields (
    talent_id UUID        NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
    field     VARCHAR(30) NOT NULL,
    PRIMARY KEY (talent_id, field)
);

CREATE INDEX idx_talent_secondary_fields ON talent_secondary_fields(talent_id);
