-- Drop indexes
DROP INDEX IF EXISTS idx_mm_risks_risk;
DROP INDEX IF EXISTS idx_mm_risks_meeting;
DROP INDEX IF EXISTS idx_meeting_minutes_date;
DROP INDEX IF EXISTS idx_meeting_minutes_created_by;
DROP INDEX IF EXISTS idx_meeting_minutes_org;

-- Drop tables
DROP TABLE IF EXISTS meeting_minutes_risks;
DROP TABLE IF EXISTS meeting_minutes;