ALTER TABLE risk_charters
    DROP COLUMN IF EXISTS risk_owner_name,
    DROP COLUMN IF EXISTS risk_owner_user_id,
    DROP COLUMN IF EXISTS risk_team_name;
