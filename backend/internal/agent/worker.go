package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *Service) RunWorker(ctx context.Context) {
	workerID := uuid.NewString()
	timer := time.NewTimer(0)
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-timer.C:
		}
		worked, _ := s.runNext(ctx, workerID)
		if worked {
			timer.Reset(time.Millisecond)
		} else {
			timer.Reset(s.limits.PollInterval)
		}
	}
}

// RunNext runs at most one durable job; useful for controlled workers and tests.
func (s *Service) RunNext(ctx context.Context) (bool, error) { return s.runNext(ctx, uuid.NewString()) }
func (s *Service) runNext(ctx context.Context, workerID string) (bool, error) {
	claim, err := s.store.Claim(ctx, workerID, s.limits.Lease)
	if err != nil {
		return false, publicError(err)
	}
	if claim == nil {
		return false, nil
	}
	runCtx, cancel := context.WithCancel(ctx)
	done := make(chan struct{})
	go func() {
		defer close(done)
		interval := s.limits.Lease / 3
		if interval < time.Millisecond {
			interval = time.Millisecond
		}
		tick := time.NewTicker(interval)
		defer tick.Stop()
		for {
			select {
			case <-runCtx.Done():
				return
			case <-tick.C:
				if s.store.Heartbeat(runCtx, claim, s.limits.Lease) != nil {
					cancel()
					return
				}
			}
		}
	}()
	err = s.process(runCtx, claim)
	cancel()
	<-done
	if err != nil && !errors.Is(err, ErrLeaseLost) && ctx.Err() == nil { // shutdown leaves the checkpoint available to the next lease
		finishCtx, finishCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer finishCancel()
		_ = s.store.MutateClaim(finishCtx, claim, func(r *Record, run *StoredRun, tx pgx.Tx) error {
			if run.Run.Status == "cancelled" || run.CancelRequested {
				return nil
			}
			run.Run.Status = "failed"
			run.Run.Error = "Pekerjaan belum dapat diselesaikan. Kirim permintaan baru untuk mencoba kembali."
			now := time.Now().UTC()
			run.Run.FinishedAt = &now
			addEvent(run, "Pekerjaan gagal diselesaikan", "failed")
			r.Conversation.Status = "failed"
			r.Conversation.UpdatedAt = now
			return nil
		})
	}
	return true, publicError(err)
}
func (s *Service) process(ctx context.Context, claim *Claim) error {
	if err := s.store.MutateClaim(ctx, claim, func(r *Record, run *StoredRun, tx pgx.Tx) error {
		if err := s.authorizeInTx(ctx, r, claim.OwnerID, tx); err != nil {
			return err
		}
		if run.CancelRequested || run.Run.Status == "cancelled" {
			return context.Canceled
		}
		if run.Run.StartedAt == nil {
			now := time.Now().UTC()
			run.Run.StartedAt = &now
			addEvent(run, "Memulai peninjauan", "running")
		}
		run.Run.Status = "running"
		r.Conversation.Status = "running"
		return nil
	}); err != nil {
		return err
	}
	initial, err := s.store.Read(ctx, claim.OwnerID, claim.ConversationID)
	if err != nil {
		return err
	}
	initialRun := findRun(initial, claim.RunID)
	if initialRun == nil || initialRun.Run.StartedAt == nil {
		return ErrInvalid
	}
	ctx, cancel := context.WithDeadline(ctx, initialRun.Run.StartedAt.Add(s.limits.MaxRunDuration))
	defer cancel()
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		record, err := s.store.Read(ctx, claim.OwnerID, claim.ConversationID)
		if err != nil {
			return err
		}
		if err = s.authorize(ctx, record, claim.OwnerID); err != nil {
			return err
		}
		run := findRun(record, claim.RunID)
		if run == nil {
			return ErrNotFound
		}
		if run.CancelRequested || run.Run.Status == "cancelled" {
			return context.Canceled
		}
		if run.Run.Status != "running" && run.Run.Status != "queued" {
			return nil
		}
		if run.Run.StartedAt != nil && time.Since(*run.Run.StartedAt) > s.limits.MaxRunDuration {
			return context.DeadlineExceeded
		}
		cp := run.Checkpoint
		if !cp.Initialized {
			actorContext, err := s.toolkit.Context(ctx, claim.OwnerID)
			if err != nil {
				return err
			}
			turns, notices, err := initialContext(record, cp, actorContext.Content)
			if err != nil {
				return err
			}
			if err = s.store.MutateClaim(ctx, claim, func(r *Record, stored *StoredRun, tx pgx.Tx) error {
				r.OrganizationIDs = unionScope(r.OrganizationIDs, actorContext.OrganizationIDs)
				if err := s.authorizeInTx(ctx, r, claim.OwnerID, tx); err != nil {
					return err
				}
				stored.OrganizationIDs = unionScope(stored.OrganizationIDs, actorContext.OrganizationIDs)
				stored.Checkpoint.Turns = turns
				stored.Checkpoint.Widgets = append(stored.Checkpoint.Widgets, notices...)
				stored.Checkpoint.Initialized = true
				return nil
			}); err != nil {
				return err
			}
			continue
		}
		if pending, ok := nextPending(cp.Turns); ok {
			if cp.ToolCount >= s.limits.MaxTools {
				return ErrInvalid
			}
			if err = s.executeTool(ctx, claim, cp, pending); err != nil {
				return err
			}
			continue
		}
		if len(cp.Turns) > 0 {
			last := cp.Turns[len(cp.Turns)-1]
			if last.Role == "assistant" && len(last.ToolCalls) == 0 {
				return s.finalize(ctx, claim, last.Content)
			}
		}
		if cp.Steps >= s.limits.MaxSteps {
			return ErrInvalid
		}
		defs := s.definitions(cp.Skills)
		callCtx, cancel := context.WithTimeout(ctx, 60*time.Second)
		answer, err := s.model.Complete(callCtx, cp.Turns, defs)
		cancel()
		if err != nil {
			return err
		}
		if answer.Role != "assistant" || len(answer.Content) > 32000 || len(answer.ToolCalls) > 8 {
			return ErrInvalid
		}
		seenCalls := map[string]bool{}
		for _, turn := range cp.Turns {
			for _, call := range turn.ToolCalls {
				seenCalls[call.ID] = true
			}
		}
		for _, c := range answer.ToolCalls {
			if seenCalls[c.ID] {
				return ErrInvalid
			}
			seenCalls[c.ID] = true
			if c.ID == "" || len(c.ID) > 200 || len(c.Arguments) > 32000 || !json.Valid(c.Arguments) {
				return ErrInvalid
			}
		}
		if err = s.store.MutateClaim(ctx, claim, func(_ *Record, stored *StoredRun, _ pgx.Tx) error {
			stored.Checkpoint.Turns = append(stored.Checkpoint.Turns, answer)
			stored.Checkpoint.Steps++
			encoded, _ := json.Marshal(stored.Checkpoint.Turns)
			if len(encoded) > 750000 {
				return ErrInvalid
			}
			return nil
		}); err != nil {
			return err
		}
	}
}
func nextPending(turns []Turn) (ToolCall, bool) {
	done := map[string]bool{}
	for _, t := range turns {
		if t.Role == "tool" {
			done[t.ToolCallID] = true
		}
	}
	for _, t := range turns {
		for _, c := range t.ToolCalls {
			if !done[c.ID] {
				return c, true
			}
		}
	}
	return ToolCall{}, false
}
func findRun(r *Record, id uuid.UUID) *StoredRun {
	for i := range r.Runs {
		if r.Runs[i].Run.ID == id {
			return &r.Runs[i]
		}
	}
	return nil
}
func addEvent(run *StoredRun, label, status string) {
	run.Run.Events = append(run.Run.Events, Activity{ID: fmt.Sprintf("%s:%d", run.Run.ID, len(run.Run.Events)+1), Label: label, Status: status, CreatedAt: time.Now().UTC()})
}
