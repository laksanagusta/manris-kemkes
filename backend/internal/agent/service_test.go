package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// The fake commits conversation metadata and staged business writes together. It
// deliberately supplies a transaction, allowing tests to detect accidental pool use.
type testTx struct {
	pgx.Tx
	writes []string
}
type memoryStore struct {
	mu       sync.Mutex
	records  map[uuid.UUID]*Record
	claims   map[uuid.UUID]*Claim
	leases   map[uuid.UUID]time.Time
	business []string
}

func newMemoryStore() *memoryStore {
	return &memoryStore{records: map[uuid.UUID]*Record{}, claims: map[uuid.UUID]*Claim{}, leases: map[uuid.UUID]time.Time{}}
}
func copyRecord(r *Record) *Record {
	b, _ := json.Marshal(r)
	var out Record
	_ = json.Unmarshal(b, &out)
	return &out
}
func (m *memoryStore) List(_ context.Context, actor uuid.UUID) ([]Record, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := []Record{}
	for _, r := range m.records {
		if r.OwnerID == actor {
			out = append(out, *copyRecord(r))
		}
	}
	return out, nil
}
func (m *memoryStore) Create(_ context.Context, r *Record) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.records[r.Conversation.ID] = copyRecord(r)
	return nil
}
func (m *memoryStore) Read(_ context.Context, actor, cid uuid.UUID) (*Record, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	r := m.records[cid]
	if r == nil || r.OwnerID != actor {
		return nil, ErrNotFound
	}
	return copyRecord(r), nil
}
func (m *memoryStore) Mutate(_ context.Context, actor, cid uuid.UUID, fn func(*Record, pgx.Tx) error) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.mutate(actor, cid, fn)
}
func (m *memoryStore) mutate(actor, cid uuid.UUID, fn func(*Record, pgx.Tx) error) error {
	old := m.records[cid]
	if old == nil || old.OwnerID != actor {
		return ErrNotFound
	}
	r := copyRecord(old)
	tx := &testTx{}
	if err := fn(r, tx); err != nil {
		return err
	}
	m.records[cid] = r
	m.business = append(m.business, tx.writes...)
	return nil
}
func (m *memoryStore) Claim(_ context.Context, worker string, lease time.Duration) (*Claim, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, r := range m.records {
		for _, run := range r.Runs {
			if (run.Run.Status == "queued" || run.Run.Status == "running") && !run.CancelRequested && time.Now().After(m.leases[run.Run.ID]) {
				generation := int64(1)
				if old := m.claims[run.Run.ID]; old != nil {
					generation = old.Generation + 1
				}
				c := &Claim{ConversationID: r.Conversation.ID, RunID: run.Run.ID, OwnerID: r.OwnerID, WorkerID: worker, Generation: generation}
				m.claims[c.RunID] = c
				m.leases[c.RunID] = time.Now().Add(lease)
				return c, nil
			}
		}
	}
	return nil, nil
}
func (m *memoryStore) valid(c *Claim) bool {
	current := m.claims[c.RunID]
	if current == nil || current.WorkerID != c.WorkerID || current.Generation != c.Generation || time.Now().After(m.leases[c.RunID]) {
		return false
	}
	r := m.records[c.ConversationID]
	run := findRun(r, c.RunID)
	return run != nil && !run.CancelRequested && (run.Run.Status == "queued" || run.Run.Status == "running")
}
func (m *memoryStore) Heartbeat(_ context.Context, c *Claim, lease time.Duration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if !m.valid(c) {
		return ErrLeaseLost
	}
	m.leases[c.RunID] = time.Now().Add(lease)
	return nil
}
func (m *memoryStore) MutateClaim(_ context.Context, c *Claim, fn func(*Record, *StoredRun, pgx.Tx) error) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if !m.valid(c) {
		return ErrLeaseLost
	}
	return m.mutate(c.OwnerID, c.ConversationID, func(r *Record, tx pgx.Tx) error { return fn(r, findRun(r, c.RunID), tx) })
}

type fakeToolkit struct {
	mu                        sync.Mutex
	revoked                   bool
	executed, applied, txAuth int
	scope                     uuid.UUID
	failApply                 bool
}

func (f *fakeToolkit) Context(context.Context, uuid.UUID) (ApplicationContext, error) {
	return ApplicationContext{Content: "Unit pengujian", OrganizationIDs: []uuid.UUID{f.scope}}, nil
}
func (f *fakeToolkit) Authorize(_ context.Context, _ uuid.UUID, _ []uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.revoked {
		return ErrForbidden
	}
	return nil
}
func (f *fakeToolkit) AuthorizeInTx(ctx context.Context, _ pgx.Tx, actor uuid.UUID, scope []uuid.UUID) error {
	f.mu.Lock()
	f.txAuth++
	f.mu.Unlock()
	return f.Authorize(ctx, actor, scope)
}
func (f *fakeToolkit) Definitions(skills []string) []ToolDefinition {
	for _, s := range skills {
		if s == "risks" {
			return []ToolDefinition{{Name: "prepare_risk", Description: "Membaca risiko dan menyiapkan usulan", Parameters: json.RawMessage(`{"type":"object"}`)}}
		}
	}
	return nil
}
func (f *fakeToolkit) Execute(context.Context, uuid.UUID, string, json.RawMessage) (ToolResult, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.executed++
	return ToolResult{Content: "Satu risiko, berdasarkan data sistem", OrganizationIDs: []uuid.UUID{f.scope}, Widgets: []Widget{{Type: "table", Title: "Risiko", Rows: []map[string]any{{"title": "Risiko nyata", "href": "/risks/123"}}}}, Operations: []Operation{{ID: "op-1", Kind: "patch_risk", TargetID: "123", Title: "Ubah deskripsi", Included: true, After: map[string]any{"description": "Baru"}, ExpectedUpdatedAt: "2026-10-24T00:00:00Z", OrganizationID: f.scope.String()}}}, nil
}
func (f *fakeToolkit) ValidateOperations(_ context.Context, _ uuid.UUID, ops []Operation) ([]Operation, error) {
	return ops, nil
}
func (f *fakeToolkit) ValidateOperationsInTx(ctx context.Context, _ pgx.Tx, actor uuid.UUID, ops []Operation) ([]Operation, error) {
	return f.ValidateOperations(ctx, actor, ops)
}
func (f *fakeToolkit) Apply(_ context.Context, tx pgx.Tx, _ uuid.UUID, ops []Operation) ([]ReceiptItem, error) {
	f.applied++
	t, ok := tx.(*testTx)
	if !ok {
		return nil, fmt.Errorf("transaction missing")
	}
	out := []ReceiptItem{}
	for _, op := range ops {
		t.writes = append(t.writes, op.ID)
		out = append(out, ReceiptItem{OperationID: op.ID, Title: op.Title, Href: "/risks/123"})
	}
	if f.failApply {
		return nil, errors.New("SQL provider secret must not escape")
	}
	return out, nil
}

type modelFunc func(context.Context, []Turn, []ToolDefinition) (Turn, error)

func (f modelFunc) Complete(ctx context.Context, t []Turn, d []ToolDefinition) (Turn, error) {
	return f(ctx, t, d)
}
func fixture(t *testing.T, model Model) (*Service, *memoryStore, *fakeToolkit, uuid.UUID, uuid.UUID) {
	t.Helper()
	store := newMemoryStore()
	tools := &fakeToolkit{scope: uuid.New()}
	s := NewService(store, tools, model, WithLimits(Limits{Lease: 120 * time.Millisecond, PollInterval: time.Millisecond}))
	actor := uuid.New()
	c, err := s.CreateConversation(context.Background(), actor, "")
	if err != nil {
		t.Fatal(err)
	}
	return s, store, tools, actor, c.ID
}
func proposingModel(counter *int) Model {
	return modelFunc(func(_ context.Context, _ []Turn, defs []ToolDefinition) (Turn, error) {
		*counter++
		switch *counter {
		case 1:
			return Turn{Role: "assistant", ToolCalls: []ToolCall{{ID: "load", Name: "load_skill", Arguments: json.RawMessage(`{"skill":"risks"}`)}}}, nil
		case 2:
			if len(defs) != 3 {
				return Turn{}, fmt.Errorf("skill did not load")
			}
			return Turn{Role: "assistant", ToolCalls: []ToolCall{{ID: "read", Name: "prepare_risk", Arguments: json.RawMessage(`{}`)}}}, nil
		default:
			return Turn{Role: "assistant", Content: "Satu risiko ditinjau. Usulan siap untuk konfirmasi."}, nil
		}
	})
}
func prepared(t *testing.T) (*Service, *memoryStore, *fakeToolkit, uuid.UUID, uuid.UUID, Proposal) {
	t.Helper()
	calls := 0
	s, store, tools, actor, cid := fixture(t, proposingModel(&calls))
	if _, e := s.SendMessage(context.Background(), actor, cid, SendMessageInput{Content: "Tinjau risiko"}); e != nil {
		t.Fatal(e)
	}
	if _, e := s.RunNext(context.Background()); e != nil {
		t.Fatal(e)
	}
	d, e := s.Detail(context.Background(), actor, cid)
	if e != nil || len(d.Proposals) != 1 {
		t.Fatalf("proposal missing: %+v %v", d, e)
	}
	return s, store, tools, actor, cid, d.Proposals[0]
}

func TestRunLoadsSkillsAndOnlyPreparesBusinessWrites(t *testing.T) {
	s, store, tools, actor, cid, p := prepared(t)
	if len(store.business) != 0 || tools.applied != 0 {
		t.Fatal("business writes occurred without confirmation")
	}
	d, _ := s.Detail(context.Background(), actor, cid)
	if d.Runs[0].Status != "waiting_for_confirmation" || p.Revision != 1 || len(d.Messages) != 2 || len(d.Messages[1].Widgets) != 1 {
		t.Fatalf("unexpected output %+v", d)
	}
	for i, e := range d.Runs[0].Events {
		if e.ID != fmt.Sprintf("%s:%d", d.Runs[0].ID, i+1) {
			t.Fatal("events not ordered")
		}
	}
	raw, _ := json.Marshal(d)
	for _, private := range []string{"organizationIds", "checkpoint", "ownerId", "toolCalls"} {
		if bytesContain(raw, private) {
			t.Fatalf("private state exposed: %s", private)
		}
	}
	_, err := s.SendMessage(context.Background(), actor, cid, SendMessageInput{Content: "Permintaan berikutnya"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.ApplyProposal(context.Background(), actor, cid, p.ID, p.Revision, "confirm-old"); !errors.Is(err, ErrStale) {
		t.Fatalf("old proposal was applicable: %v", err)
	}
}
func bytesContain(raw []byte, s string) bool {
	for i := 0; i+len(s) <= len(raw); i++ {
		if string(raw[i:i+len(s)]) == s {
			return true
		}
	}
	return false
}
func TestApplyAtomicReceiptRevisionAndIdempotency(t *testing.T) {
	s, store, tools, actor, cid, p := prepared(t)
	tools.failApply = true
	if _, err := s.ApplyProposal(context.Background(), actor, cid, p.ID, 1, "key-atomic"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("unsafe error %v", err)
	}
	if len(store.business) != 0 {
		t.Fatal("partial business writes committed")
	}
	tools.failApply = false
	edited := append([]Operation(nil), p.Operations...)
	edited[0].After = map[string]any{"description": "Edited"}
	p, err := s.UpdateProposal(context.Background(), actor, cid, p.ID, 1, edited)
	if err != nil || p.Revision != 2 {
		t.Fatal(err)
	}
	if _, err = s.ApplyProposal(context.Background(), actor, cid, p.ID, 1, "key-atomic"); !errors.Is(err, ErrConflict) {
		t.Fatalf("old revision applied: %v", err)
	}
	first, err := s.ApplyProposal(context.Background(), actor, cid, p.ID, 2, "key-atomic")
	if err != nil {
		t.Fatal(err)
	}
	second, err := s.ApplyProposal(context.Background(), actor, cid, p.ID, 2, "key-atomic")
	if err != nil {
		t.Fatal(err)
	}
	if len(store.business) != 1 || digest(first) != digest(second) {
		t.Fatal("retry duplicated writes or changed receipt")
	}
	if _, err = s.ApplyProposal(context.Background(), actor, cid, p.ID, 2, "different-key"); !errors.Is(err, ErrConflict) {
		t.Fatal("idempotency binding missing")
	}
	if tools.txAuth == 0 {
		t.Fatal("no in-transaction access check")
	}
}
func TestProposalEditCannotForgeTargetOrPrecondition(t *testing.T) {
	s, _, _, actor, cid, p := prepared(t)
	for _, change := range []func(*Operation){func(o *Operation) { o.TargetID = "elsewhere" }, func(o *Operation) { o.Kind = "create_risk" }, func(o *Operation) { o.OrganizationID = uuid.NewString() }, func(o *Operation) { o.ExpectedUpdatedAt = "" }} {
		edited := append([]Operation(nil), p.Operations...)
		change(&edited[0])
		if _, err := s.UpdateProposal(context.Background(), actor, cid, p.ID, 1, edited); !errors.Is(err, ErrInvalid) {
			t.Fatalf("forged edit accepted %v", err)
		}
	}
}
func TestEveryObjectIsPrivateAndScopeRevocationHidesSnapshots(t *testing.T) {
	s, _, tools, actor, cid, p := prepared(t)
	other := uuid.New()
	runID := p.RunID
	for name, call := range map[string]func() error{"detail": func() error { _, e := s.Detail(context.Background(), other, cid); return e }, "send": func() error {
		_, e := s.SendMessage(context.Background(), other, cid, SendMessageInput{Content: "Hi"})
		return e
	}, "cancel": func() error { return s.Cancel(context.Background(), other, cid, runID) }, "edit": func() error {
		_, e := s.UpdateProposal(context.Background(), other, cid, p.ID, 1, p.Operations)
		return e
	}, "apply": func() error {
		_, e := s.ApplyProposal(context.Background(), other, cid, p.ID, 1, "private-key")
		return e
	}, "reject": func() error { _, e := s.RejectProposal(context.Background(), other, cid, p.ID, 1); return e }, "attachment": func() error {
		_, e := s.AddAttachment(context.Background(), other, cid, AttachmentInput{Name: "x.pdf", MimeType: "application/pdf", Size: 2, Text: "private"})
		return e
	}} {
		t.Run(name, func(t *testing.T) {
			if e := call(); !errors.Is(e, ErrNotFound) {
				t.Fatalf("private object revealed %v", e)
			}
		})
	}
	tools.mu.Lock()
	tools.revoked = true
	tools.mu.Unlock()
	if _, e := s.Detail(context.Background(), actor, cid); !errors.Is(e, ErrForbidden) {
		t.Fatal("revoked snapshot readable")
	}
	list, e := s.ListConversations(context.Background(), actor)
	if e != nil || len(list) != 0 {
		t.Fatal("revoked conversation listed")
	}
	if _, e = s.ApplyProposal(context.Background(), actor, cid, p.ID, 1, "revoked-key"); !errors.Is(e, ErrForbidden) {
		t.Fatal("revoked proposal applicable")
	}
}
func TestCheckpointRestartDoesNotRepeatCompletedModelOrToolSteps(t *testing.T) {
	calls := 0
	model := modelFunc(func(context.Context, []Turn, []ToolDefinition) (Turn, error) {
		calls++
		return Turn{Role: "assistant", Content: "Selesai"}, nil
	})
	s, store, tools, actor, cid := fixture(t, model)
	run, e := s.SendMessage(context.Background(), actor, cid, SendMessageInput{Content: "Tinjau"})
	if e != nil {
		t.Fatal(e)
	}
	if e = store.Mutate(context.Background(), actor, cid, func(r *Record, _ pgx.Tx) error {
		cp := &r.Runs[0].Checkpoint
		cp.Initialized = true
		cp.Skills = []string{"risks"}
		cp.Steps = 2
		cp.ToolCount = 1
		cp.Turns = []Turn{{Role: "system", Content: "saved"}, {Role: "user", Content: "Tinjau"}, {Role: "assistant", ToolCalls: []ToolCall{{ID: "saved-call", Name: "prepare_risk", Arguments: json.RawMessage(`{}`)}}}, {Role: "tool", ToolCallID: "saved-call", Content: "saved-result"}, {Role: "assistant", Content: "Jawaban telah disimpan"}}
		return nil
	}); e != nil {
		t.Fatal(e)
	}
	if _, e = s.RunNext(context.Background()); e != nil {
		t.Fatal(e)
	}
	d, _ := s.Detail(context.Background(), actor, cid)
	if calls != 0 || tools.executed != 0 || d.Runs[0].ID != run.ID || d.Runs[0].Status != "completed" || d.Messages[1].Content != "Jawaban telah disimpan" {
		t.Fatal("completed checkpoint replayed")
	}
}
func TestOldLeaseCannotPublishAfterWorkerRecovery(t *testing.T) {
	s, store, _, actor, cid := fixture(t, modelFunc(func(context.Context, []Turn, []ToolDefinition) (Turn, error) { return Turn{}, nil }))
	_, _ = s.SendMessage(context.Background(), actor, cid, SendMessageInput{Content: "Hi"})
	old, _ := store.Claim(context.Background(), "old", time.Second)
	store.mu.Lock()
	store.leases[old.RunID] = time.Now().Add(-time.Second)
	store.mu.Unlock()
	fresh, _ := store.Claim(context.Background(), "new", time.Second)
	if fresh == nil || fresh.Generation <= old.Generation {
		t.Fatal("claim was not recovered")
	}
	e := store.MutateClaim(context.Background(), old, func(r *Record, _ *StoredRun, _ pgx.Tx) error { r.Conversation.Title = "duplicate"; return nil })
	if !errors.Is(e, ErrLeaseLost) {
		t.Fatal("old worker was not fenced")
	}
}
func TestCancellationStopsInFlightModelAndCannotPublishAnswer(t *testing.T) {
	entered := make(chan struct{})
	model := modelFunc(func(ctx context.Context, _ []Turn, _ []ToolDefinition) (Turn, error) {
		close(entered)
		<-ctx.Done()
		return Turn{}, ctx.Err()
	})
	s, _, _, actor, cid := fixture(t, model)
	run, _ := s.SendMessage(context.Background(), actor, cid, SendMessageInput{Content: "Long task"})
	done := make(chan error, 1)
	go func() { _, err := s.RunNext(context.Background()); done <- err }()
	select {
	case <-entered:
	case <-time.After(time.Second):
		t.Fatal("worker did not start")
	}
	if err := s.Cancel(context.Background(), actor, cid, run.ID); err != nil {
		t.Fatal(err)
	}
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("model was not cancelled")
	}
	d, _ := s.Detail(context.Background(), actor, cid)
	if d.Runs[0].Status != "cancelled" || len(d.Messages) != 1 {
		t.Fatal("cancelled run published output")
	}
}
func TestRequestRetryBindingsAndEmptyArrays(t *testing.T) {
	s, _, _, actor, cid := fixture(t, modelFunc(func(context.Context, []Turn, []ToolDefinition) (Turn, error) {
		return Turn{Role: "assistant", Content: "Hi"}, nil
	}))
	d, _ := s.Detail(context.Background(), actor, cid)
	b, _ := json.Marshal(d)
	if !bytesContain(b, `"messages":[]`) || !bytesContain(b, `"runs":[]`) {
		t.Fatal("empty arrays are null")
	}
	in := AttachmentInput{Name: "x.pdf", MimeType: "application/pdf", Size: 2, Text: "private", IdempotencyKey: "file-key"}
	a, e := s.AddAttachment(context.Background(), actor, cid, in)
	if e != nil {
		t.Fatal(e)
	}
	batt, e := s.AddAttachment(context.Background(), actor, cid, in)
	if e != nil || a.ID != batt.ID {
		t.Fatal("attachment retry duplicated")
	}
	input := SendMessageInput{Content: "Hi", AttachmentIDs: []string{a.ID.String()}, IdempotencyKey: "request-1"}
	first, e := s.SendMessage(context.Background(), actor, cid, input)
	if e != nil {
		t.Fatal(e)
	}
	second, e := s.SendMessage(context.Background(), actor, cid, input)
	if e != nil || first.ID != second.ID {
		t.Fatal("message retry duplicated")
	}
	input.Content = "Different"
	if _, e = s.SendMessage(context.Background(), actor, cid, input); !errors.Is(e, ErrConflict) {
		t.Fatal("retry key reused with different payload")
	}
}

func TestStructuredClarificationWaitsAndReplyStartsNewRun(t *testing.T) {
	calls := 0
	model := modelFunc(func(_ context.Context, _ []Turn, _ []ToolDefinition) (Turn, error) {
		calls++
		if calls == 1 {
			return Turn{Role: "assistant", ToolCalls: []ToolCall{{ID: "question", Name: "ask_user", Arguments: json.RawMessage(`{"question":"Unit mana yang perlu ditinjau?","choices":["Unit A","Unit B"]}`)}}}, nil
		}
		return Turn{Role: "assistant", Content: "Pilih unit untuk melanjutkan."}, nil
	})
	s, store, _, actor, cid := fixture(t, model)
	first, err := s.SendMessage(context.Background(), actor, cid, SendMessageInput{Content: "Tinjau unit"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = s.RunNext(context.Background()); err != nil {
		t.Fatal(err)
	}
	detail, err := s.Detail(context.Background(), actor, cid)
	if err != nil {
		t.Fatal(err)
	}
	if detail.Runs[0].Status != "waiting_for_input" || len(detail.Proposals) != 0 || len(detail.Messages[1].Widgets) != 1 || detail.Messages[1].Widgets[0].Rows[0]["value"] != "Unit A" {
		t.Fatalf("missing structured clarification %+v", detail)
	}
	next, err := s.SendMessage(context.Background(), actor, cid, SendMessageInput{Content: "Unit A"})
	if err != nil || next.ID == first.ID {
		t.Fatalf("reply did not create new work %v", err)
	}
	saved, _ := store.Read(context.Background(), actor, cid)
	if saved.Runs[0].Run.Status != "completed" || saved.Runs[1].Run.Status != "queued" {
		t.Fatal("waiting input run not closed sequentially")
	}
}

func TestCommittedApplyIsNotRelabelledByCancellation(t *testing.T) {
	s, _, _, actor, cid, p := prepared(t)
	if _, err := s.ApplyProposal(context.Background(), actor, cid, p.ID, 1, "commit-first"); err != nil {
		t.Fatal(err)
	}
	if err := s.Cancel(context.Background(), actor, cid, p.RunID); err != nil {
		t.Fatal(err)
	}
	detail, _ := s.Detail(context.Background(), actor, cid)
	if detail.Runs[0].Status != "completed" || detail.Proposals[0].Status != "applied" {
		t.Fatal("cancellation misrepresented committed changes")
	}
}
