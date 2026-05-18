CREATE TABLE IF NOT EXISTS notices (
    id           UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    content      TEXT         NOT NULL,
    category     VARCHAR(30)  NOT NULL,
    pinned       BOOLEAN      NOT NULL DEFAULT FALSE,
    hidden       BOOLEAN      NOT NULL DEFAULT FALSE,
    view_count   INTEGER      NOT NULL DEFAULT 0,
    author_name  VARCHAR(255) NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notice_created  ON notices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notice_category ON notices (category);
