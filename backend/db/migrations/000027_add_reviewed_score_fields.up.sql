-- Add reviewer scoring fields for dual-score model
-- "Skor Sementara" stays in probability/impact/weight/nilai/inherent_score
-- "Skor Penilaian" is stored in reviewed_* columns

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS reviewed_probability   INTEGER,
  ADD COLUMN IF NOT EXISTS reviewed_impact        INTEGER,
  ADD COLUMN IF NOT EXISTS reviewed_weight        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS reviewed_nilai         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS reviewed_score         INTEGER,
  ADD COLUMN IF NOT EXISTS score_change_label     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS effectiveness_label    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewed_by            UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at            TIMESTAMPTZ;

COMMENT ON COLUMN risks.reviewed_probability IS 'Skor Penilaian: probabilitas dari reviewer';
COMMENT ON COLUMN risks.reviewed_impact IS 'Skor Penilaian: dampak dari reviewer';
COMMENT ON COLUMN risks.reviewed_weight IS 'Skor Penilaian: bobot otomatis dari matrix';
COMMENT ON COLUMN risks.reviewed_nilai IS 'Skor Penilaian: nilai = reviewed_probability × reviewed_impact × reviewed_weight';
COMMENT ON COLUMN risks.reviewed_score IS 'Skor Penilaian: inherent score = round(reviewed_nilai)';
COMMENT ON COLUMN risks.score_change_label IS 'Auto-computed: perubahan skor risiko';
COMMENT ON COLUMN risks.effectiveness_label IS 'Auto-computed: efektivitas pengelolaan risiko';
COMMENT ON COLUMN risks.reviewed_by IS 'UUID reviewer yang memberikan skor penilaian';
COMMENT ON COLUMN risks.reviewed_at IS 'Waktu reviewer memberikan skor penilaian';
