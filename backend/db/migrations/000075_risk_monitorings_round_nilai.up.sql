UPDATE risk_monitorings
SET source_nilai = ROUND(source_nilai),
    observed_nilai = CASE
        WHEN observed_nilai IS NULL THEN NULL
        ELSE ROUND(observed_nilai)
    END;

ALTER TABLE risk_monitorings
ALTER COLUMN source_nilai TYPE NUMERIC(10,0) USING ROUND(source_nilai),
ALTER COLUMN observed_nilai TYPE NUMERIC(10,0) USING CASE
    WHEN observed_nilai IS NULL THEN NULL
    ELSE ROUND(observed_nilai)
END;
