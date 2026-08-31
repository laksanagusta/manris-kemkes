ALTER TABLE working_paper_risk_exclusions
    ADD CONSTRAINT working_paper_risk_exclusions_reason_check
    CHECK (TRIM(BOTH ' ' FROM reason) <> '');
