-- The down migration is only safe when no terminal not_reported rows remain.
UPDATE mitigation_tasks
SET status = 'pending'
WHERE status = 'not_reported';

ALTER TABLE mitigation_tasks
    DROP CONSTRAINT IF EXISTS mitigation_tasks_status_check;

ALTER TABLE mitigation_tasks
    ADD CONSTRAINT mitigation_tasks_status_check CHECK (
        status IN ('pending', 'done', 'overdue', 'skipped')
    );
