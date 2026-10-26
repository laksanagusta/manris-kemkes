package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/agent"
)

// These tests use only an explicitly supplied disposable database. They never
// discover development credentials or apply migrations automatically.
func agentTestDB(t *testing.T) (context.Context, *pgxpool.Pool, uuid.UUID) {
	t.Helper()
	url := os.Getenv("AGENT_TEST_DATABASE_URL")
	if url == "" {
		t.Skip("AGENT_TEST_DATABASE_URL must name an isolated database migrated through 73")
	}
	if !strings.Contains(url, "test") {
		t.Fatal("test database name required")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	t.Cleanup(cancel)
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		t.Fatal(err)
	}
	cfg.MaxConns = 1
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	actor := uuid.New()
	_, err = pool.Exec(ctx, `INSERT INTO users(id,name,username,email,password_hash,role,status) VALUES($1,'Agent test',$2,$3,'not-a-password','superadmin','active')`, actor, "agent_"+actor.String(), actor.String()+"@example.invalid")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		cleanupCtx, c := context.WithTimeout(context.Background(), 3*time.Second)
		defer c()
		_, _ = pool.Exec(cleanupCtx, `DELETE FROM users WHERE id=$1`, actor)
	})
	return ctx, pool, actor
}

type integrationModel struct{ calls int }

func (m *integrationModel) Complete(context.Context, []agent.Turn, []agent.ToolDefinition) (agent.Turn, error) {
	m.calls++
	if m.calls == 1 {
		return agent.Turn{Role: "assistant", ToolCalls: []agent.ToolCall{{ID: "read-1", Name: "prepare_test", Arguments: json.RawMessage(`{}`)}}}, nil
	}
	return agent.Turn{Role: "assistant", Content: "Dua usulan siap ditinjau"}, nil
}

type integrationToolkit struct {
	pool     *pgxpool.Pool
	fail     bool
	txChecks int
}

func (k *integrationToolkit) Context(context.Context, uuid.UUID) (string, error) {
	return "Isolated test", nil
}
func (k *integrationToolkit) Authorize(ctx context.Context, actor uuid.UUID, _ []uuid.UUID) error {
	var active bool
	err := k.pool.QueryRow(ctx, `SELECT status='active' FROM users WHERE id=$1`, actor).Scan(&active)
	if err != nil || !active {
		return agent.ErrForbidden
	}
	return nil
}
func (k *integrationToolkit) AuthorizeInTx(ctx context.Context, tx pgx.Tx, actor uuid.UUID, _ []uuid.UUID) error {
	k.txChecks++
	var active bool
	err := tx.QueryRow(ctx, `SELECT status='active' FROM users WHERE id=$1`, actor).Scan(&active)
	if err != nil || !active {
		return agent.ErrForbidden
	}
	return nil
}
func (k *integrationToolkit) Definitions([]string) []agent.ToolDefinition {
	return []agent.ToolDefinition{{Name: "prepare_test", Description: "Prepare only", Parameters: json.RawMessage(`{"type":"object"}`)}}
}
func (k *integrationToolkit) Execute(context.Context, uuid.UUID, string, json.RawMessage) (agent.ToolResult, error) {
	return agent.ToolResult{Content: "Two operations", Operations: []agent.Operation{{ID: "one", Kind: "test", Title: "First", Included: true, After: map[string]any{"value": 1}}, {ID: "two", Kind: "test", Title: "Second", Included: true, After: map[string]any{"value": 2}}}}, nil
}
func (k *integrationToolkit) ValidateOperations(_ context.Context, _ uuid.UUID, ops []agent.Operation) ([]agent.Operation, error) {
	return ops, nil
}
func (k *integrationToolkit) ValidateOperationsInTx(_ context.Context, _ pgx.Tx, _ uuid.UUID, ops []agent.Operation) ([]agent.Operation, error) {
	return ops, nil
}
func (k *integrationToolkit) Apply(ctx context.Context, tx pgx.Tx, actor uuid.UUID, ops []agent.Operation) ([]agent.ReceiptItem, error) {
	if err := k.AuthorizeInTx(ctx, tx, actor, nil); err != nil {
		return nil, err
	}
	receipt := []agent.ReceiptItem{}
	for _, op := range ops {
		if _, err := tx.Exec(ctx, `INSERT INTO agent_test_writes(operation_id) VALUES($1)`, op.ID); err != nil {
			return nil, err
		}
		if k.fail && op.ID == "two" {
			return nil, fmt.Errorf("forced second operation failure")
		}
		receipt = append(receipt, agent.ReceiptItem{OperationID: op.ID, Title: op.Title})
	}
	return receipt, nil
}
func TestAgentStoreAtomicApplyAndReceiptWithOneConnection(t *testing.T) {
	ctx, pool, actor := agentTestDB(t)
	if _, err := pool.Exec(ctx, `CREATE TEMP TABLE agent_test_writes(operation_id text PRIMARY KEY)`); err != nil {
		t.Fatal(err)
	}
	tools := &integrationToolkit{pool: pool}
	service := agent.NewService(NewAgentStore(pool), tools, &integrationModel{})
	conversation, err := service.CreateConversation(ctx, actor, "")
	if err != nil {
		t.Fatal(err)
	}
	input := agent.SendMessageInput{Content: "Prepare two changes", IdempotencyKey: "send-once"}
	first, err := service.SendMessage(ctx, actor, conversation.ID, input)
	if err != nil {
		t.Fatal(err)
	}
	retry, err := service.SendMessage(ctx, actor, conversation.ID, input)
	if err != nil || first.ID != retry.ID {
		t.Fatalf("send retry not bound: %v", err)
	}
	if _, err = service.RunNext(ctx); err != nil {
		t.Fatal(err)
	}
	detail, err := service.Detail(ctx, actor, conversation.ID)
	if err != nil || len(detail.Proposals) != 1 {
		t.Fatalf("missing proposal: %v", err)
	}
	proposal := detail.Proposals[0]
	var count int
	if err = pool.QueryRow(ctx, `SELECT count(*) FROM agent_test_writes`).Scan(&count); err != nil || count != 0 {
		t.Fatal("business writes before confirmation")
	}
	tools.fail = true
	if _, err = service.ApplyProposal(ctx, actor, conversation.ID, proposal.ID, 1, "confirm-same"); !errors.Is(err, agent.ErrInvalid) {
		t.Fatalf("expected sanitized apply failure, got %v", err)
	}
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM agent_test_writes`).Scan(&count)
	if count != 0 {
		t.Fatal("a failed batch partially committed")
	}
	detail, _ = service.Detail(ctx, actor, conversation.ID)
	if detail.Proposals[0].Status != "proposed" || detail.Proposals[0].AppliedAt != nil {
		t.Fatal("failed transaction persisted receipt")
	}
	tools.fail = false
	applied, err := service.ApplyProposal(ctx, actor, conversation.ID, proposal.ID, 1, "confirm-same")
	if err != nil {
		t.Fatal(err)
	}
	replayed, err := service.ApplyProposal(ctx, actor, conversation.ID, proposal.ID, 1, "confirm-same")
	if err != nil || len(applied.Receipt) != 2 || len(replayed.Receipt) != 2 {
		t.Fatalf("replay failed %v", err)
	}
	_ = pool.QueryRow(ctx, `SELECT count(*) FROM agent_test_writes`).Scan(&count)
	if count != 2 {
		t.Fatalf("retry duplicated business writes %d", count)
	}
	if tools.txChecks == 0 {
		t.Fatal("authorization bypassed supplied transaction")
	}
	// A completely new store/service sees the same committed receipt.
	reopened := agent.NewService(NewAgentStore(pool), tools, &integrationModel{})
	persisted, err := reopened.ApplyProposal(ctx, actor, conversation.ID, proposal.ID, 1, "confirm-same")
	if err != nil || persisted.AppliedAt == nil || len(persisted.Receipt) != 2 {
		t.Fatalf("restart lost idempotency %v", err)
	}
	if _, err = reopened.ApplyProposal(ctx, uuid.New(), conversation.ID, proposal.ID, 1, "confirm-same"); !errors.Is(err, agent.ErrNotFound) {
		t.Fatal("another actor obtained receipt")
	}
}
func TestAgentStoreRecoversExpiredLeaseAndFencesOldWorker(t *testing.T) {
	ctx, pool, actor := agentTestDB(t)
	store := NewAgentStore(pool)
	tools := &integrationToolkit{pool: pool}
	service := agent.NewService(store, tools, &integrationModel{})
	c, err := service.CreateConversation(ctx, actor, "Recovery")
	if err != nil {
		t.Fatal(err)
	}
	r, err := service.SendMessage(ctx, actor, c.ID, agent.SendMessageInput{Content: "Continue"})
	if err != nil {
		t.Fatal(err)
	}
	old, err := store.Claim(ctx, "dead-process", 10*time.Millisecond)
	if err != nil || old == nil {
		t.Fatal(err)
	}
	if _, err = pool.Exec(ctx, `SELECT pg_sleep(0.02)`); err != nil {
		t.Fatal(err)
	}
	fresh, err := store.Claim(ctx, "resumed-process", time.Second)
	if err != nil || fresh == nil || fresh.RunID != r.ID || fresh.Generation <= old.Generation {
		t.Fatalf("lease not recovered %+v %v", fresh, err)
	}
	err = store.MutateClaim(ctx, old, func(record *agent.Record, _ *agent.StoredRun, _ pgx.Tx) error {
		record.Conversation.Title = "WRONG"
		return nil
	})
	if !errors.Is(err, agent.ErrLeaseLost) {
		t.Fatalf("dead worker checkpoint accepted %v", err)
	}
	if err = store.Heartbeat(ctx, old, time.Second); !errors.Is(err, agent.ErrLeaseLost) {
		t.Fatal("dead worker heartbeat accepted")
	}
	err = store.MutateClaim(ctx, fresh, func(record *agent.Record, run *agent.StoredRun, _ pgx.Tx) error {
		run.Checkpoint.Turns = []agent.Turn{{Role: "assistant", Content: "Persisted final response"}}
		run.Checkpoint.Initialized = true
		record.Conversation.Title = "Resumed"
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	reopened := NewAgentStore(pool)
	saved, err := reopened.Read(ctx, actor, c.ID)
	if err != nil || saved.Conversation.Title != "Resumed" || saved.Runs[0].Checkpoint.Turns[0].Content != "Persisted final response" {
		t.Fatal("checkpoint not durable")
	}
	if err = service.Cancel(ctx, actor, c.ID, r.ID); err != nil {
		t.Fatal(err)
	}
	if err = store.MutateClaim(ctx, fresh, func(_ *agent.Record, _ *agent.StoredRun, _ pgx.Tx) error { return nil }); !errors.Is(err, agent.ErrLeaseLost) {
		t.Fatal("cancelled run accepts checkpoint")
	}
}
