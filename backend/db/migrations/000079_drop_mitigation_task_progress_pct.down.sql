ALTER TABLE mitigation_tasks ADD COLUMN IF NOT EXISTS progress_pct INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100);
