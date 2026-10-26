-- Rollback restores the schema only; previously stored snapshots are not recovered.
CREATE TABLE shinka_snapshot_events (
    event_id uuid PRIMARY KEY,
    request_hash text NOT NULL CHECK(length(request_hash) = 64),
    response jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
