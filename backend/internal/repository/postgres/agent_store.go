package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/agent"
)

// AgentStore keeps private aggregates behind owner-filtered queries. Run rows are
// a bounded work queue projection; the aggregate contains durable checkpoints.
type AgentStore struct{ pool *pgxpool.Pool }

func NewAgentStore(pool *pgxpool.Pool) *AgentStore { return &AgentStore{pool: pool} }

var _ agent.Store = (*AgentStore)(nil)

func (s *AgentStore) List(ctx context.Context, actor uuid.UUID) ([]agent.Record, error) {
	rows, err := s.pool.Query(ctx, `SELECT id,title,status,created_at,updated_at,body->'organizationIds' FROM agent_conversations WHERE owner_id=$1 ORDER BY updated_at DESC LIMIT 50`, actor)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []agent.Record{}
	for rows.Next() {
		r := agent.Record{OwnerID: actor}
		var scope []byte
		if err = rows.Scan(&r.Conversation.ID, &r.Conversation.Title, &r.Conversation.Status, &r.Conversation.CreatedAt, &r.Conversation.UpdatedAt, &scope); err != nil {
			return nil, err
		}
		if len(scope) > 0 {
			if err = json.Unmarshal(scope, &r.OrganizationIDs); err != nil {
				return nil, err
			}
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
func (s *AgentStore) Create(ctx context.Context, r *agent.Record) error {
	body, err := json.Marshal(r)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `INSERT INTO agent_conversations(id,owner_id,title,status,created_at,updated_at,body) VALUES($1,$2,$3,$4,$5,$6,$7)`, r.Conversation.ID, r.OwnerID, r.Conversation.Title, r.Conversation.Status, r.Conversation.CreatedAt, r.Conversation.UpdatedAt, body)
	return err
}
func (s *AgentStore) Read(ctx context.Context, actor, cid uuid.UUID) (*agent.Record, error) {
	var body []byte
	err := s.pool.QueryRow(ctx, `SELECT body FROM agent_conversations WHERE id=$1 AND owner_id=$2`, cid, actor).Scan(&body)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, agent.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	var r agent.Record
	if err = json.Unmarshal(body, &r); err != nil {
		return nil, err
	}
	if r.OwnerID != actor {
		return nil, agent.ErrNotFound
	}
	return &r, nil
}
func (s *AgentStore) Mutate(ctx context.Context, actor, cid uuid.UUID, fn func(*agent.Record, pgx.Tx) error) error {
	return s.mutate(ctx, actor, cid, nil, fn)
}
func (s *AgentStore) MutateClaim(ctx context.Context, claim *agent.Claim, fn func(*agent.Record, *agent.StoredRun, pgx.Tx) error) error {
	return s.mutate(ctx, claim.OwnerID, claim.ConversationID, claim, func(r *agent.Record, tx pgx.Tx) error {
		for i := range r.Runs {
			if r.Runs[i].Run.ID == claim.RunID {
				return fn(r, &r.Runs[i], tx)
			}
		}
		return agent.ErrNotFound
	})
}
func (s *AgentStore) mutate(ctx context.Context, actor, cid uuid.UUID, claim *agent.Claim, fn func(*agent.Record, pgx.Tx) error) error {
	tx, err := s.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(context.Background())
	var body []byte
	err = tx.QueryRow(ctx, `SELECT body FROM agent_conversations WHERE id=$1 AND owner_id=$2 FOR UPDATE`, cid, actor).Scan(&body)
	if errors.Is(err, pgx.ErrNoRows) {
		return agent.ErrNotFound
	}
	if err != nil {
		return err
	}
	var r agent.Record
	if err = json.Unmarshal(body, &r); err != nil {
		return err
	}
	if r.OwnerID != actor {
		return agent.ErrNotFound
	}
	if claim != nil {
		var valid bool
		err = tx.QueryRow(ctx, `SELECT worker_id=$2 AND generation=$3 AND lease_until>clock_timestamp() AND status IN ('queued','running') FROM agent_runs WHERE id=$1 FOR UPDATE`, claim.RunID, claim.WorkerID, claim.Generation).Scan(&valid)
		if errors.Is(err, pgx.ErrNoRows) || err == nil && !valid {
			return agent.ErrLeaseLost
		}
		if err != nil {
			return err
		}
	}
	if err = fn(&r, tx); err != nil {
		return err
	}
	// A slow checkpoint must not commit after its lease expired. The row remains
	// locked, so a replacement claimant can only proceed after this transaction.
	if claim != nil {
		var valid bool
		err = tx.QueryRow(ctx, `SELECT worker_id=$2 AND generation=$3 AND lease_until>clock_timestamp() FROM agent_runs WHERE id=$1`, claim.RunID, claim.WorkerID, claim.Generation).Scan(&valid)
		if err != nil {
			return err
		}
		if !valid {
			return agent.ErrLeaseLost
		}
	}
	body, err = json.Marshal(&r)
	if err != nil {
		return err
	}
	if len(body) > 12*1024*1024 {
		return agent.ErrInvalidInput
	}
	_, err = tx.Exec(ctx, `UPDATE agent_conversations SET title=$2,status=$3,updated_at=$4,body=$5 WHERE id=$1`, cid, r.Conversation.Title, r.Conversation.Status, r.Conversation.UpdatedAt, body)
	if err != nil {
		return err
	}
	for _, run := range r.Runs {
		_, err = tx.Exec(ctx, `INSERT INTO agent_runs(id,conversation_id,owner_id,status,cancel_requested,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,cancel_requested=EXCLUDED.cancel_requested`, run.Run.ID, cid, actor, run.Run.Status, run.CancelRequested, run.Checkpoint.CreatedAt)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
func (s *AgentStore) Claim(ctx context.Context, workerID string, lease time.Duration) (*agent.Claim, error) {
	var claim agent.Claim
	err := s.pool.QueryRow(ctx, `WITH next_run AS (SELECT id FROM agent_runs WHERE status IN ('queued','running') AND cancel_requested=false AND (lease_until IS NULL OR lease_until<clock_timestamp()) ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE agent_runs r SET worker_id=$1,lease_until=clock_timestamp()+($2 * interval '1 millisecond'),generation=r.generation+1 FROM next_run n WHERE r.id=n.id RETURNING r.id,r.conversation_id,r.owner_id,r.generation`, workerID, lease.Milliseconds()).Scan(&claim.RunID, &claim.ConversationID, &claim.OwnerID, &claim.Generation)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	claim.WorkerID = workerID
	return &claim, nil
}
func (s *AgentStore) Heartbeat(ctx context.Context, claim *agent.Claim, lease time.Duration) error {
	tag, err := s.pool.Exec(ctx, `UPDATE agent_runs SET lease_until=clock_timestamp()+($4 * interval '1 millisecond') WHERE id=$1 AND worker_id=$2 AND generation=$3 AND lease_until>clock_timestamp() AND status IN ('queued','running') AND cancel_requested=false`, claim.RunID, claim.WorkerID, claim.Generation, lease.Milliseconds())
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return agent.ErrLeaseLost
	}
	return nil
}
