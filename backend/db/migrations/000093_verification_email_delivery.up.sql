CREATE TABLE auth_verification_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email text NOT NULL,
    password_fingerprint char(64) NOT NULL,
    registration boolean NOT NULL,
    status text NOT NULL DEFAULT 'queued' CHECK (
        status IN ('queued', 'sending', 'retrying', 'accepted', 'failed', 'cancelled')
    ),
    failure text NOT NULL DEFAULT '' CHECK (
        failure IN ('', 'temporary', 'recipient', 'configuration', 'permanent')
    ),
    attempt integer NOT NULL DEFAULT 0 CHECK (attempt >= 0),
    available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX auth_verification_deliveries_claim_idx
    ON auth_verification_deliveries(available_at, created_at)
    WHERE status IN ('queued', 'sending', 'retrying');

CREATE INDEX auth_verification_deliveries_user_idx
    ON auth_verification_deliveries(user_id, registration, created_at DESC);

CREATE INDEX auth_verification_deliveries_prune_idx
    ON auth_verification_deliveries(updated_at)
    WHERE status IN ('accepted', 'failed', 'cancelled');
