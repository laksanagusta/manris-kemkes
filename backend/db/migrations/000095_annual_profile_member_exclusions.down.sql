DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM annual_risk_profile_exclusions) THEN
        RAISE EXCEPTION 'Cannot roll back annual profile exclusions after exclusion history has been recorded.';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION annual_monitoring_members_as_of(profile_id uuid, cutoff date)
RETURNS TABLE(version_group_id uuid, risk_id uuid, profile_version_id uuid, effective_from date,
              baseline jsonb, objective_id uuid, change_reason text)
LANGUAGE sql STABLE AS $$
    SELECT DISTINCT ON (m.version_group_id)
           m.version_group_id, m.risk_id, p.id, m.effective_from, m.baseline, m.objective_id, m.change_reason
    FROM annual_risk_profile_versions selected
    JOIN annual_risk_profile_versions p
      ON p.organization_id = selected.organization_id AND p.year = selected.year AND p.version <= selected.version
    JOIN annual_risk_profile_members m ON m.profile_version_id = p.id
    WHERE selected.id = profile_id AND p.finalized_at IS NOT NULL AND m.effective_from <= cutoff
    ORDER BY m.version_group_id, p.version DESC
$$;

DROP TABLE annual_risk_profile_exclusions;
