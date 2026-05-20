DROP INDEX IF EXISTS idx_planning_ro_scopes_ro_id;
DROP INDEX IF EXISTS idx_planning_ros_period;
DROP INDEX IF EXISTS idx_planning_activities_program;
DROP INDEX IF EXISTS idx_planning_programs_iku;
DROP INDEX IF EXISTS idx_planning_ikus_objective;
DROP INDEX IF EXISTS idx_planning_objectives_goal;
DROP INDEX IF EXISTS idx_planning_goals_period;
DROP INDEX IF EXISTS idx_planning_goals_organization;
DROP INDEX IF EXISTS idx_planning_ro_scopes_unique_category;
DROP INDEX IF EXISTS idx_planning_ro_scopes_unique_org;

DROP TABLE IF EXISTS planning_ro_scopes;
DROP TABLE IF EXISTS planning_ros;
DROP TABLE IF EXISTS planning_activities;
DROP TABLE IF EXISTS planning_programs;
DROP TABLE IF EXISTS planning_ikus;
DROP TABLE IF EXISTS planning_objectives;
DROP TABLE IF EXISTS planning_goals;
