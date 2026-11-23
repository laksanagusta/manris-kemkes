CREATE TABLE annual_risk_profile_codes (
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    year integer NOT NULL CHECK (year BETWEEN 1900 AND 9998),
    sequence_no bigint GENERATED ALWAYS AS IDENTITY,
    code text GENERATED ALWAYS AS (
        'PRT-' || year::text || '-' || lpad(sequence_no::text, GREATEST(4, length(sequence_no::text)), '0')
    ) STORED UNIQUE,
    PRIMARY KEY (organization_id, year)
);

-- Issue one code for existing profiles, including the ones with only a draft.
INSERT INTO annual_risk_profile_codes (organization_id, year)
SELECT organization_id, year
FROM annual_risk_profile_versions
GROUP BY organization_id, year
ORDER BY year, min(created_at), organization_id;

CREATE FUNCTION ensure_annual_risk_profile_code() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO annual_risk_profile_codes (organization_id, year)
    SELECT NEW.organization_id, NEW.year
    WHERE NOT EXISTS (
        SELECT 1 FROM annual_risk_profile_codes
        WHERE organization_id = NEW.organization_id AND year = NEW.year
    )
    ON CONFLICT (organization_id, year) DO NOTHING;
    RETURN NEW;
END $$;

CREATE TRIGGER ensure_annual_risk_profile_code
    BEFORE INSERT ON annual_risk_profile_versions
    FOR EACH ROW EXECUTE FUNCTION ensure_annual_risk_profile_code();

ALTER TABLE annual_risk_profile_versions
    ADD CONSTRAINT annual_risk_profile_versions_code_fkey
    FOREIGN KEY (organization_id, year) REFERENCES annual_risk_profile_codes(organization_id, year);
