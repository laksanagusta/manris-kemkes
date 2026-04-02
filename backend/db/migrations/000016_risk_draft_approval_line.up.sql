ALTER TABLE risks
ADD COLUMN IF NOT EXISTS draft_approval_line JSONB NOT NULL DEFAULT '[]'::jsonb;
