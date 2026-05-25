DROP INDEX IF EXISTS idx_planning_goals_planning_id;

ALTER TABLE planning_goals
    DROP COLUMN IF EXISTS planning_id;

DROP TABLE IF EXISTS planning;

