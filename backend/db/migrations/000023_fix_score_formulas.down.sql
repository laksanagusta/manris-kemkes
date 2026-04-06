ALTER TABLE risks DROP COLUMN IF EXISTS inherent_score;
ALTER TABLE risks ADD COLUMN inherent_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED;

ALTER TABLE risks DROP COLUMN IF EXISTS target_score;
ALTER TABLE risks ADD COLUMN target_score INTEGER GENERATED ALWAYS AS (target_probability * target_impact) STORED;
