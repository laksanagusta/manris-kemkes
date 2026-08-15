-- Mitigation task progress is tracked in mitigation_tasks. Monitoring keeps
-- the aggregate progress summary and the general follow-up note only.
ALTER TABLE risk_monitorings
    DROP COLUMN IF EXISTS mitigation_obstacles,
    DROP COLUMN IF EXISTS mitigation_follow_up;
