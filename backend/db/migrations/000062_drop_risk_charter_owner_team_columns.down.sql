ALTER TABLE risk_charters
    ADD COLUMN IF NOT EXISTS risk_owner_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS risk_owner_user_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS risk_team_name TEXT NOT NULL DEFAULT '';
