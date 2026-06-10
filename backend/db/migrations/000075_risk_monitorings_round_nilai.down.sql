ALTER TABLE risk_monitorings
ALTER COLUMN source_nilai TYPE NUMERIC(10,4) USING source_nilai::NUMERIC(10,4),
ALTER COLUMN observed_nilai TYPE NUMERIC(10,4) USING observed_nilai::NUMERIC(10,4);
