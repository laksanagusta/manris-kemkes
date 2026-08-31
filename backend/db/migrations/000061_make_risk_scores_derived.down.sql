-- Down migration restores writable compatibility columns using the canonical
-- values. Any historical divergence between the old duplicate columns and
-- nilai/target_nilai cannot be reconstructed.
ALTER TABLE risks
    DROP COLUMN IF EXISTS inherent_score,
    DROP COLUMN IF EXISTS target_score;

ALTER TABLE risks
    ADD COLUMN inherent_score integer,
    ADD COLUMN target_score integer;

UPDATE risks
SET inherent_score = ROUND(COALESCE(nilai, 0))::integer,
    target_score = ROUND(COALESCE(target_nilai, 0))::integer;
