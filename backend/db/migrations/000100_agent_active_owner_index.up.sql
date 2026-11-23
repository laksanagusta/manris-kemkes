CREATE INDEX agent_runs_active_owner_idx
    ON agent_runs (owner_id)
    WHERE status IN ('queued', 'running', 'cancelled');
