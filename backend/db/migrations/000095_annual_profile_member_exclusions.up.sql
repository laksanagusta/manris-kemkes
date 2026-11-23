CREATE TABLE annual_risk_profile_exclusions (
    profile_version_id uuid NOT NULL REFERENCES annual_risk_profile_versions(id) ON DELETE CASCADE,
    version_group_id uuid NOT NULL,
    effective_from date NOT NULL,
    change_reason text NOT NULL CHECK (char_length(btrim(change_reason)) BETWEEN 1 AND 2000),
    created_by uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (profile_version_id, version_group_id)
);

CREATE OR REPLACE FUNCTION annual_monitoring_members_as_of(profile_id uuid, cutoff date)
RETURNS TABLE(version_group_id uuid, risk_id uuid, profile_version_id uuid, effective_from date,
              baseline jsonb, objective_id uuid, change_reason text)
LANGUAGE sql STABLE AS $$
    WITH versions AS (
        SELECT p.id, p.version
        FROM annual_risk_profile_versions selected
        JOIN annual_risk_profile_versions p
          ON p.organization_id = selected.organization_id AND p.year = selected.year AND p.version <= selected.version
        WHERE selected.id = profile_id AND p.finalized_at IS NOT NULL
    ), exclusions AS (
        SELECT e.version_group_id, max(p.version) AS version
        FROM versions p JOIN annual_risk_profile_exclusions e ON e.profile_version_id = p.id
        WHERE e.effective_from <= cutoff
        GROUP BY e.version_group_id
    )
    SELECT DISTINCT ON (m.version_group_id)
           m.version_group_id, m.risk_id, p.id, m.effective_from, m.baseline, m.objective_id, m.change_reason
    FROM versions p
    JOIN annual_risk_profile_members m ON m.profile_version_id = p.id
    LEFT JOIN exclusions e ON e.version_group_id = m.version_group_id
    WHERE m.effective_from <= cutoff AND (e.version IS NULL OR p.version > e.version)
    ORDER BY m.version_group_id, p.version DESC
$$;
