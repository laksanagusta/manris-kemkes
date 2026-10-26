-- Private conversation metadata and checkpointed work. Business writes stay in
-- existing domain tables and commit together with the aggregate receipt.
CREATE TABLE agent_conversations (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title text NOT NULL CHECK (length(title) <= 240),
 status text NOT NULL CHECK (status IN ('queued','running','waiting_for_input','waiting_for_confirmation','completed','failed','cancelled')),
 body jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_conversations_owner_recent_idx ON agent_conversations(owner_id,updated_at DESC);
CREATE TABLE agent_runs (
 id uuid PRIMARY KEY,
 conversation_id uuid NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 status text NOT NULL CHECK (status IN ('queued','running','waiting_for_input','waiting_for_confirmation','completed','failed','cancelled')),
 cancel_requested boolean NOT NULL DEFAULT false,
 worker_id text,
 generation bigint NOT NULL DEFAULT 0,
 lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX agent_runs_one_active_idx ON agent_runs(conversation_id) WHERE status IN ('queued','running');
CREATE INDEX agent_runs_claim_idx ON agent_runs(created_at,lease_until) WHERE status IN ('queued','running') AND cancel_requested=false;
INSERT INTO system_settings(key,value,category,description) VALUES ('ai.model.agent','','ai','Model untuk Manris Agent; kosong mengikuti model standar') ON CONFLICT(key) DO NOTHING;
