ALTER TABLE user_invitations
    ADD COLUMN IF NOT EXISTS token      VARCHAR(64),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_user_invitations_token
    ON user_invitations (token)
    WHERE token IS NOT NULL;
