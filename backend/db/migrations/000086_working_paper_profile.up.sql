ALTER TABLE working_papers
    ADD COLUMN profile_version_id uuid REFERENCES annual_risk_profile_versions(id),
    ADD COLUMN observation_cutoff date,
    ADD CONSTRAINT working_paper_profile_cutoff_pair CHECK (
        (profile_version_id IS NULL) = (observation_cutoff IS NULL)
    );

CREATE UNIQUE INDEX working_papers_active_profile_cutoff
    ON working_papers (profile_version_id, observation_cutoff)
    WHERE profile_version_id IS NOT NULL AND status <> 'cancelled';
