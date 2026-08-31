-- Drop indexes
DROP INDEX IF EXISTS idx_comm_logs_risk;
DROP INDEX IF EXISTS idx_control_tests_control;
DROP INDEX IF EXISTS idx_mitigations_risk;
DROP INDEX IF EXISTS idx_incidents_org;
DROP INDEX IF EXISTS idx_risks_created_by;
DROP INDEX IF EXISTS idx_risks_status;
DROP INDEX IF EXISTS idx_risks_org;

-- Drop tables
DROP TABLE IF EXISTS control_tests CASCADE;
DROP TABLE IF EXISTS controls CASCADE;
DROP TABLE IF EXISTS communication_logs CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS mitigations CASCADE;
DROP TABLE IF EXISTS risks CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
