CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES users(id),
    request_id UUID NOT NULL,
    message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (created_by, request_id)
);
