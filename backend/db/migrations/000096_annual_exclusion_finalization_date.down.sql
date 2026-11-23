UPDATE annual_risk_profile_exclusions x
SET effective_from = LEAST(make_date(p.year, 12, 31),
    GREATEST(make_date(p.year, 1, 1), m.effective_from, (x.created_at AT TIME ZONE 'Asia/Jakarta')::date))
FROM annual_risk_profile_versions p
LEFT JOIN annual_risk_profile_members m ON m.profile_version_id = p.previous_version_id
WHERE p.id = x.profile_version_id AND x.effective_from IS NULL
  AND m.version_group_id = x.version_group_id;

ALTER TABLE annual_risk_profile_exclusions ALTER COLUMN effective_from SET NOT NULL;
