-- The deleted void rows cannot be reconstructed by a down migration.
-- This rollback only restores the retired schema surface for compatibility.

ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_status_check,
    ADD COLUMN IF NOT EXISTS voided_by uuid,
    ADD COLUMN IF NOT EXISTS voided_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS void_reason text DEFAULT ''::text NOT NULL;

UPDATE risk_monitorings
SET status = 'finalized'
WHERE status = 'final';

ALTER TABLE risk_monitorings
    ADD CONSTRAINT risk_monitorings_voided_by_fkey
        FOREIGN KEY (voided_by) REFERENCES users(id),
    ADD CONSTRAINT risk_monitorings_status_check
        CHECK (status IN ('draft', 'final', 'void'));
