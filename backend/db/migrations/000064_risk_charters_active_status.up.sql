UPDATE risk_charters
SET status = 'active'
WHERE status = 'approved';

ALTER TABLE risk_charters
	DROP CONSTRAINT IF EXISTS risk_charters_status_check;

ALTER TABLE risk_charters
	ADD CONSTRAINT risk_charters_status_check
	CHECK (status IN ('draft', 'in_review', 'active', 'archived'));

ALTER TABLE risk_charters
	ALTER COLUMN status SET DEFAULT 'active';
