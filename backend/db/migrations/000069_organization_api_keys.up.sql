CREATE TABLE organization_api_keys (
    organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    id uuid NOT NULL UNIQUE,
    key_hash char(64) NOT NULL UNIQUE,
    prefix text NOT NULL,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    last_used_at timestamptz,
    window_started_at timestamptz NOT NULL DEFAULT NOW(),
    request_count integer NOT NULL DEFAULT 0 CHECK (request_count BETWEEN 0 AND 61)
);

CREATE TABLE organization_api_key_events (
    id uuid PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL CHECK (action IN ('generate', 'regenerate')),
    created_at timestamptz NOT NULL DEFAULT NOW()
);
