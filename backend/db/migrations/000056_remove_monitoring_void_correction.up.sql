-- Final monitoring records are terminal. The correction workflow and its
-- void-state metadata are retired from the product.

-- Detach legacy references before deleting the retired void rows. The local
-- database currently has 9 such rows and no working-paper references, but the
-- update keeps this migration safe for environments with old task links.
UPDATE working_paper_risks
SET monitoring_id = NULL
WHERE monitoring_id IN (
    SELECT id FROM risk_monitorings WHERE status = 'void'
);

DELETE FROM risk_monitorings
WHERE status = 'void';

ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_status_check,
    DROP COLUMN IF EXISTS voided_by,
    DROP COLUMN IF EXISTS voided_at,
    DROP COLUMN IF EXISTS void_reason;

-- The legacy schema called the canonical completed state "finalized".
-- Normalize it before adding the current draft/final constraint.
UPDATE risk_monitorings
SET status = 'final'
WHERE status = 'finalized';

ALTER TABLE risk_monitorings
    ADD CONSTRAINT risk_monitorings_status_check
    CHECK (status IN ('draft', 'final'));
