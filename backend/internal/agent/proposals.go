package agent

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *Service) UpdateProposal(ctx context.Context, actor, cid, pid uuid.UUID, revision int, operations []Operation) (Proposal, error) {
	var out Proposal
	err := s.store.Mutate(ctx, actor, cid, func(r *Record, tx pgx.Tx) error {
		if err := s.authorizeInTx(ctx, r, actor, tx); err != nil {
			return err
		}
		p := findProposal(r, pid)
		if p == nil {
			return ErrNotFound
		}
		if p.Proposal.Status != "proposed" || p.Proposal.Revision != revision {
			return ErrConflict
		}
		if len(operations) != len(p.Proposal.Operations) {
			return ErrInvalid
		}
		for i, op := range operations {
			old := p.Proposal.Operations[i]
			if op.ID != old.ID || op.Kind != old.Kind || op.TargetID != old.TargetID || op.OrganizationID != old.OrganizationID || op.ExpectedUpdatedAt != old.ExpectedUpdatedAt || digest(op.Before) != digest(old.Before) {
				return ErrInvalid
			}
		}
		valid, err := s.validateInTx(ctx, tx, actor, operations)
		if err != nil {
			return sanitizeToolError(err)
		}
		if err = validateOperations(valid); err != nil {
			return err
		}
		p.Proposal.Operations = valid
		p.Proposal.Revision++
		p.ContentHash = digest(valid)
		p.OrganizationIDs = unionScope(p.OrganizationIDs, operationScope(valid))
		r.OrganizationIDs = unionScope(r.OrganizationIDs, p.OrganizationIDs)
		out = p.Proposal
		r.Conversation.UpdatedAt = time.Now().UTC()
		return nil
	})
	return out, publicError(err)
}
func (s *Service) RejectProposal(ctx context.Context, actor, cid, pid uuid.UUID, revision int) (Proposal, error) {
	var out Proposal
	err := s.store.Mutate(ctx, actor, cid, func(r *Record, tx pgx.Tx) error {
		if err := s.authorizeInTx(ctx, r, actor, tx); err != nil {
			return err
		}
		p := findProposal(r, pid)
		if p == nil {
			return ErrNotFound
		}
		if p.Proposal.Revision != revision {
			return ErrConflict
		}
		if p.Proposal.Status == "rejected" {
			out = p.Proposal
			return nil
		}
		if p.Proposal.Status != "proposed" {
			return ErrConflict
		}
		p.Proposal.Status = "rejected"
		finishProposalRun(r, p.Proposal.RunID)
		out = p.Proposal
		return nil
	})
	return out, publicError(err)
}
func (s *Service) ApplyProposal(ctx context.Context, actor, cid, pid uuid.UUID, revision int, key string) (Proposal, error) {
	var out Proposal
	if len(key) < 8 || len(key) > 120 {
		return out, ErrInvalid
	}
	err := s.store.Mutate(ctx, actor, cid, func(r *Record, tx pgx.Tx) error {
		if err := s.authorizeInTx(ctx, r, actor, tx); err != nil {
			return err
		}
		p := findProposal(r, pid)
		if p == nil {
			return ErrNotFound
		}
		for _, other := range r.Proposals {
			if other.ApplyKey == key && other.Proposal.ID != pid {
				return ErrConflict
			}
		}
		if p.Proposal.Revision != revision {
			return ErrConflict
		}
		if p.Proposal.Status == "applied" {
			if p.ApplyKey != key {
				return ErrConflict
			}
			out = p.Proposal
			return nil
		}
		if p.Proposal.Status == "stale" {
			return ErrStale
		}
		if p.Proposal.Status != "proposed" || p.ContentHash != digest(p.Proposal.Operations) {
			return ErrConflict
		}
		ops := []Operation{}
		for _, op := range p.Proposal.Operations {
			if op.Included {
				ops = append(ops, op)
			}
		}
		if len(ops) == 0 {
			return ErrInvalid
		}
		if tx == nil {
			return ErrUnavailable
		}
		receipt, err := s.toolkit.Apply(ctx, tx, actor, ops)
		if err != nil {
			return sanitizeToolError(err)
		}
		if len(receipt) != len(ops) {
			return ErrInvalid
		}
		expected := map[string]bool{}
		for _, op := range ops {
			expected[op.ID] = true
		}
		for _, item := range receipt {
			if !expected[item.OperationID] || item.Title == "" || len(item.Title) > 500 || (item.Href != "" && !safeHref(item.Href)) {
				return ErrInvalid
			}
			delete(expected, item.OperationID)
		}
		now := time.Now().UTC()
		p.Proposal.Status = "applied"
		p.Proposal.AppliedAt = &now
		p.Proposal.Receipt = receipt
		p.ApplyKey = key
		finishProposalRun(r, p.Proposal.RunID)
		r.Conversation.UpdatedAt = now
		out = p.Proposal
		return nil
	})
	if errors.Is(err, ErrStale) {
		_ = s.store.Mutate(ctx, actor, cid, func(r *Record, tx pgx.Tx) error {
			if err := s.authorizeInTx(ctx, r, actor, tx); err != nil {
				return err
			}
			p := findProposal(r, pid)
			if p != nil && p.Proposal.Revision == revision && p.Proposal.Status == "proposed" {
				p.Proposal.Status = "stale"
			}
			return nil
		})
	}
	return out, publicError(err)
}
func findProposal(r *Record, id uuid.UUID) *StoredProposal {
	for i := range r.Proposals {
		if r.Proposals[i].Proposal.ID == id {
			return &r.Proposals[i]
		}
	}
	return nil
}
func finishProposalRun(r *Record, rid uuid.UUID) {
	now := time.Now().UTC()
	for i := range r.Runs {
		if r.Runs[i].Run.ID == rid && r.Runs[i].Run.Status == "waiting_for_confirmation" {
			r.Runs[i].Run.Status = "completed"
			r.Runs[i].Run.FinishedAt = &now
			addEvent(&r.Runs[i], "Peninjauan usulan selesai", "completed")
		}
	}
	r.Conversation.Status = "completed"
	r.Conversation.UpdatedAt = now
}
