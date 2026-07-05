-- Quarter precision cannot be reconstructed after normalization. Rollback only
-- restores compatibility so an older application can be deployed deliberately.
ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_assessment_cycle_check;

ALTER TABLE risks
    DROP CONSTRAINT IF EXISTS risks_assessment_cycle_semester_check;

ALTER TABLE working_papers
    DROP CONSTRAINT IF EXISTS working_papers_assessment_cycle_semester_check;

ALTER TABLE working_paper_risk_exclusions
    DROP CONSTRAINT IF EXISTS working_paper_risk_exclusions_cycle_semester_check;

ALTER TABLE risk_monitorings
    ADD CONSTRAINT risk_monitorings_assessment_cycle_check
    CHECK (assessment_cycle ~ '^[0-9]{4}-(H[12]|Q[1-4])$');
