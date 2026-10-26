// Package agenttools connects the agent to bounded, authorized Manris operations.
// No model tool applies business writes; only Apply uses the caller's transaction.
package agenttools

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/agent"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/service"
	"github.com/manris/backend/internal/timeutil"
)

type queryDB interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

type Toolkit struct {
	pool      *pgxpool.Pool
	hierarchy *service.OrganizationHierarchy
	now       func() time.Time
}

var _ agent.Toolkit = (*Toolkit)(nil)

func New(pool *pgxpool.Pool, hierarchy *service.OrganizationHierarchy) *Toolkit {
	return &Toolkit{pool: pool, hierarchy: hierarchy, now: time.Now}
}

func strictDecode(raw []byte, dst any) error {
	if len(raw) == 0 || len(raw) > 128*1024 {
		return agent.ErrInvalid
	}
	d := json.NewDecoder(bytes.NewReader(raw))
	d.DisallowUnknownFields()
	if err := d.Decode(dst); err != nil {
		return fmt.Errorf("%w: isi tidak sesuai skema", agent.ErrInvalid)
	}
	if err := d.Decode(new(any)); !errors.Is(err, io.EOF) {
		return agent.ErrInvalid
	}
	return nil
}

func invalid(message string) error { return fmt.Errorf("%w: %s", agent.ErrInvalid, message) }

func jsonMap(value any) map[string]any {
	raw, err := json.Marshal(value)
	if err != nil {
		return map[string]any{}
	}
	var m map[string]any
	if json.Unmarshal(raw, &m) != nil {
		return map[string]any{}
	}
	return m
}

func content(value any) string {
	raw, err := json.Marshal(value)
	if err != nil {
		return "{}"
	}
	return string(raw)
}

func (t *Toolkit) currentCycle() string {
	now := t.now().In(timeutil.JakartaLocation())
	return fmt.Sprintf("%04d-Q%d", now.Year(), (int(now.Month())-1)/3+1)
}

func scopeLabel(scope *entity.AccessScope, ids []uuid.UUID) string {
	if len(ids) == 1 && scope.OrganizationID != nil && ids[0] == *scope.OrganizationID {
		return "Organisasi saya"
	}
	if len(ids) == 1 {
		return "Unit terpilih"
	}
	if len(ids) == 0 && scope.IsGlobal {
		return "Seluruh organisasi (akses global)"
	}
	return fmt.Sprintf("%d organisasi yang diizinkan", len(ids))
}

func sourceScope(ids []uuid.UUID, more ...uuid.UUID) []uuid.UUID {
	result := make([]uuid.UUID, 0, len(ids)+len(more))
	seen := map[uuid.UUID]bool{}
	for _, id := range append(append([]uuid.UUID(nil), ids...), more...) {
		if id != uuid.Nil && !seen[id] {
			seen[id] = true
			result = append(result, id)
		}
	}
	return result
}

func (t *Toolkit) widget(kind, title string, scope *entity.AccessScope, ids []uuid.UUID) agent.Widget {
	return agent.Widget{ID: uuid.NewString(), Type: kind, Title: title, SnapshotAt: t.now().UTC(), ScopeLabel: scopeLabel(scope, ids)}
}

func safeDomainError(err error) error {
	if err == nil {
		return nil
	}
	for _, known := range []error{agent.ErrInvalid, agent.ErrForbidden, agent.ErrStale, agent.ErrNotFound, agent.ErrConflict} {
		if errors.Is(err, known) {
			return err
		}
	}
	if errors.Is(err, domainerrors.ErrForbidden) || errors.Is(err, domainerrors.ErrUnauthorized) {
		return agent.ErrForbidden
	}
	if errors.Is(err, domainerrors.ErrNotFound) || errors.Is(err, domainerrors.ErrRiskNotFound) || errors.Is(err, pgx.ErrNoRows) {
		return agent.ErrNotFound
	}
	var appErr *domainerrors.AppError
	if errors.As(err, &appErr) && appErr.Code != "" && !strings.Contains(appErr.Code, "DATABASE") && appErr.Code != "INTERNAL_ERROR" {
		return invalid(appErr.Message)
	}
	return domainerrors.ErrInternal
}
