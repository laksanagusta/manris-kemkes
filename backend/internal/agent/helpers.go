package agent

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func publicError(err error) error {
	if err == nil {
		return nil
	}
	for _, e := range []error{ErrNotFound, ErrForbidden, ErrInvalid, ErrConflict, ErrStale, ErrUnavailable, ErrStorageNotReady, ErrLeaseLost, context.Canceled, context.DeadlineExceeded} {
		if errors.Is(err, e) {
			return e
		}
	}
	var databaseError *pgconn.PgError
	if errors.As(err, &databaseError) && databaseError.Code == "42P01" {
		return ErrStorageNotReady
	}
	return ErrUnavailable
}
func (s *Service) authorize(ctx context.Context, r *Record, actor uuid.UUID) error {
	if actor == uuid.Nil || actor != r.OwnerID {
		return ErrNotFound
	}
	if err := s.toolkit.Authorize(ctx, actor, r.OrganizationIDs); err != nil {
		return ErrForbidden
	}
	return nil
}
func sanitizeToolError(err error) error {
	for _, e := range []error{ErrInvalid, ErrForbidden, ErrNotFound, ErrConflict, ErrStale} {
		if errors.Is(err, e) {
			return e
		}
	}
	return ErrInvalid
}
func digest(v any) string {
	b, _ := json.Marshal(v)
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}
func unionScope(a, b []uuid.UUID) []uuid.UUID {
	out := append([]uuid.UUID(nil), a...)
	for _, id := range b {
		if id == uuid.Nil {
			continue
		}
		found := false
		for _, existing := range out {
			if existing == id {
				found = true
				break
			}
		}
		if !found {
			out = append(out, id)
		}
	}
	return out
}
func operationScope(ops []Operation) []uuid.UUID {
	out := []uuid.UUID{}
	for _, op := range ops {
		if id, e := uuid.Parse(op.OrganizationID); e == nil {
			out = unionScope(out, []uuid.UUID{id})
		}
	}
	return out
}
func uniqueStrings(in []string) []string {
	out := []string{}
	for _, v := range in {
		found := false
		for _, s := range out {
			if s == v {
				found = true
				break
			}
		}
		if !found {
			out = append(out, v)
		}
	}
	return out
}
func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) > n {
		return string(r[:n]) + "…"
	}
	return s
}
func safeHref(v string) bool {
	return strings.HasPrefix(v, "/") && !strings.HasPrefix(v, "//") && !strings.ContainsAny(v, "\\\r\n\t") && !strings.Contains(v, ":")
}
func validateOperations(ops []Operation) error {
	if len(ops) == 0 || len(ops) > 30 {
		return ErrInvalid
	}
	seen := map[string]bool{}
	for _, o := range ops {
		if o.ID == "" || seen[o.ID] || o.Kind == "" || len(o.Title) > 300 || o.After == nil {
			return ErrInvalid
		}
		seen[o.ID] = true
	}
	b, e := json.Marshal(ops)
	if e != nil || len(b) > 150000 {
		return ErrInvalid
	}
	return nil
}

func (s *Service) authorizeInTx(ctx context.Context, r *Record, actor uuid.UUID, tx pgx.Tx) error {
	if actor == uuid.Nil || actor != r.OwnerID {
		return ErrNotFound
	}
	if authorizer, ok := s.toolkit.(TransactionalAuthorizer); ok && tx != nil {
		if err := authorizer.AuthorizeInTx(ctx, tx, actor, r.OrganizationIDs); err != nil {
			return ErrForbidden
		}
		return nil
	}
	return s.authorize(ctx, r, actor)
}
func (s *Service) validateInTx(ctx context.Context, tx pgx.Tx, actor uuid.UUID, ops []Operation) ([]Operation, error) {
	if validator, ok := s.toolkit.(TransactionalOperationValidator); ok && tx != nil {
		return validator.ValidateOperationsInTx(ctx, tx, actor, ops)
	}
	return s.toolkit.ValidateOperations(ctx, actor, ops)
}
