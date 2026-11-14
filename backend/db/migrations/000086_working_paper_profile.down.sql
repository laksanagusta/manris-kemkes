DROP INDEX working_papers_active_profile_cutoff;
ALTER TABLE working_papers DROP CONSTRAINT working_paper_profile_cutoff_pair,
    DROP COLUMN profile_version_id, DROP COLUMN observation_cutoff;
