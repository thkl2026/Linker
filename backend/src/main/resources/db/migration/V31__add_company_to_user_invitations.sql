ALTER TABLE user_invitations
    ADD COLUMN IF NOT EXISTS company VARCHAR(200);
