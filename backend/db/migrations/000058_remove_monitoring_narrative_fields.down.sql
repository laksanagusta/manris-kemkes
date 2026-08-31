-- Compatibility rollback. Values removed by the forward migration cannot be
-- reconstructed after it has been committed.
ALTER TABLE risk_monitorings
    ADD COLUMN IF NOT EXISTS condition_summary TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS event_summary TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS trend TEXT NOT NULL DEFAULT 'stable',
    ADD COLUMN IF NOT EXISTS effectiveness_conclusion TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS follow_up_note TEXT NOT NULL DEFAULT '';

ALTER TABLE risk_monitorings
    DROP CONSTRAINT IF EXISTS risk_monitorings_trend_check,
    ADD CONSTRAINT risk_monitorings_trend_check
        CHECK (trend = ANY (ARRAY['up'::text, 'down'::text, 'stable'::text]));
