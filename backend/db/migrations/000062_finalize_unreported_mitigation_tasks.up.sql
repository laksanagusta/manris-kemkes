-- A mitigation without a valid report at monitoring finalization is a closed
-- historical outcome, not an open task to be carried into a later period.
ALTER TABLE mitigation_tasks
    DROP CONSTRAINT IF EXISTS mitigation_tasks_status_check;

ALTER TABLE mitigation_tasks
    ADD CONSTRAINT mitigation_tasks_status_check CHECK (
        status IN ('pending', 'done', 'overdue', 'skipped', 'not_reported')
    );
