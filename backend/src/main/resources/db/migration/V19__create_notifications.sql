CREATE TABLE IF NOT EXISTS notifications (
    id          UUID         NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    type        VARCHAR(50)  NOT NULL,
    title       VARCHAR(255) NOT NULL,
    message     TEXT         NOT NULL,
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_created ON notifications (created_at DESC);
