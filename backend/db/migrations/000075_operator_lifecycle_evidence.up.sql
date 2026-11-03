CREATE TABLE risk_event_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES incidents(id),
    body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    request_id UUID NOT NULL,
    UNIQUE(event_id, request_id)
);
CREATE INDEX risk_event_notes_event_time ON risk_event_notes(event_id, created_at, id);
ALTER TABLE risk_monitorings ADD COLUMN evidence_snapshot JSONB;
