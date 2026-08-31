-- Exclusions are selected through the roster checkbox and no longer require
-- a user-entered explanation. Keep the reason column for compatibility with
-- existing records and downstream readers, but allow it to be empty.
ALTER TABLE working_paper_risk_exclusions
    DROP CONSTRAINT IF EXISTS working_paper_risk_exclusions_reason_check;
