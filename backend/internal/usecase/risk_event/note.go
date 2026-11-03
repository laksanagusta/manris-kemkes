package risk_event

import (
	"context"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"strings"
	"unicode/utf8"
)

type NoteRepository interface {
	Add(context.Context, *entity.RiskEventNote, uuid.UUID) (*entity.RiskEventNote, error)
	List(context.Context, uuid.UUID) ([]entity.RiskEventNote, error)
}
type noteEventReader interface {
	GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.RiskEvent, error)
}
type NoteService struct {
	notes  NoteRepository
	events noteEventReader
}

func NewNoteService(notes NoteRepository, events noteEventReader) *NoteService {
	return &NoteService{notes: notes, events: events}
}
func (s *NoteService) event(ctx context.Context, scope *entity.AccessScope, id uuid.UUID) (*entity.RiskEvent, error) {
	if scope == nil || scope.UserID == uuid.Nil || (!scope.IsGlobal && len(scope.AccessibleOrgIDs) == 0) {
		return nil, domainerrors.ErrForbidden
	}
	ids := scope.AccessibleOrgIDs
	if scope.IsGlobal {
		ids = nil
	}
	event, err := s.events.GetByID(ctx, id, ids)
	if err != nil {
		return nil, err
	}
	if event == nil || !scope.CanRead(event.OrganizationID) {
		return nil, domainerrors.ErrForbidden
	}
	return event, nil
}
func (s *NoteService) List(ctx context.Context, scope *entity.AccessScope, id uuid.UUID) ([]entity.RiskEventNote, error) {
	if _, err := s.event(ctx, scope, id); err != nil {
		return nil, err
	}
	return s.notes.List(ctx, id)
}
func (s *NoteService) Add(ctx context.Context, scope *entity.AccessScope, id uuid.UUID, body string, requestID uuid.UUID) (*entity.RiskEventNote, error) {
	event, err := s.event(ctx, scope, id)
	if err != nil {
		return nil, err
	}
	if !scope.CanWrite(event.OrganizationID) {
		return nil, domainerrors.ErrForbidden
	}
	body = strings.TrimSpace(body)
	if utf8.RuneCountInString(body) < 1 || utf8.RuneCountInString(body) > 2000 || requestID == uuid.Nil {
		return nil, domainerrors.ErrInvalidInput
	}
	return s.notes.Add(ctx, &entity.RiskEventNote{EventID: id, Body: body, CreatedBy: scope.UserID}, requestID)
}
