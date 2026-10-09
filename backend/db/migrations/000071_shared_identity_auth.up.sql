-- users and organizations are the shared identity directory; retain IDs and business FKs.
CREATE TABLE auth_applications (
    id text PRIMARY KEY CHECK (id ~ '^[a-z][a-z0-9_-]{1,63}$'),
    name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
    active boolean NOT NULL DEFAULT true,
    key_hash char(64) UNIQUE,
    key_version integer NOT NULL DEFAULT 1,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CHECK (id = 'manris' OR key_hash IS NOT NULL)
);
-- The embedded Manris backend is a trusted in-process client. No secret is sent to its browser.
INSERT INTO auth_applications(id,name) VALUES ('manris','Manris');
CREATE TABLE auth_sessions (
    id uuid PRIMARY KEY,
    application_id text NOT NULL REFERENCES auth_applications(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_version integer NOT NULL,
    password_fingerprint char(64) NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    revoked_at timestamptz
);
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expires_at);
CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);
CREATE TABLE auth_application_events (
    id uuid PRIMARY KEY,
    application_id text NOT NULL REFERENCES auth_applications(id),
    actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL CHECK (action IN ('create','rotate_key','disable')),
    created_at timestamptz NOT NULL DEFAULT NOW()
);
