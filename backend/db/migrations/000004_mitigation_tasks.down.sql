DROP TABLE IF EXISTS mitigation_tasks;
ALTER TABLE mitigations DROP COLUMN IF EXISTS report_day;
ALTER TABLE mitigations DROP COLUMN IF EXISTS report_date;
