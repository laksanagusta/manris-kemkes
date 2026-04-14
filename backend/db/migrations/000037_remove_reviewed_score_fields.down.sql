-- Migration 000037 Rollback: Restore reviewed scoring fields
-- This restores all 9 reviewed scoring columns that were removed
-- Columns are restored with their original types from migration 000027

ALTER TABLE risks
  ADD COLUMN reviewed_probability   INTEGER,
  ADD COLUMN reviewed_impact        INTEGER,
  ADD COLUMN reviewed_weight        DOUBLE PRECISION,
  ADD COLUMN reviewed_nilai         DOUBLE PRECISION,
  ADD COLUMN reviewed_score         INTEGER,
  ADD COLUMN score_change_label     TEXT NOT NULL DEFAULT '',
  ADD COLUMN effectiveness_label    TEXT NOT NULL DEFAULT '',
  ADD COLUMN reviewed_by            UUID REFERENCES users(id),
  ADD COLUMN reviewed_at            TIMESTAMPTZ;

-- Add comments for clarity
COMMENT ON COLUMN risks.reviewed_probability IS 'Probability score reviewed by authorized user';
COMMENT ON COLUMN risks.reviewed_impact IS 'Impact score reviewed by authorized user';
COMMENT ON COLUMN risks.reviewed_weight IS 'Weight reviewed by authorized user';
COMMENT ON COLUMN risks.reviewed_nilai IS 'Nilai reviewed by authorized user';
COMMENT ON COLUMN risks.reviewed_score IS 'Overall risk score after review';
COMMENT ON COLUMN risks.score_change_label IS 'Label describing score change after review';
COMMENT ON COLUMN risks.effectiveness_label IS 'Label describing control effectiveness';
COMMENT ON COLUMN risks.reviewed_by IS 'User who performed the review';
COMMENT ON COLUMN risks.reviewed_at IS 'Timestamp of when review was performed';
