package risk_event

import (
	"context"
	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"strings"
	"testing"
)

type noteStoreStub struct{ created int }

func (s *noteStoreStub) Add(_ context.Context, n *entity.RiskEventNote, _ uuid.UUID) (*entity.RiskEventNote, error) {
	s.created++
	return n, nil
}
func (s *noteStoreStub) List(context.Context, uuid.UUID) ([]entity.RiskEventNote, error) {
	return []entity.RiskEventNote{}, nil
}

type noteEventStub struct{ event *entity.RiskEvent }

func (s noteEventStub) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.RiskEvent, error) {
	return s.event, nil
}
func TestAddEventNoteValidatesBodyAndWriteScope(t *testing.T) {
	org, other, actor, eventID := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	for _, tt := range []struct {
		name, body string
		home       uuid.UUID
		want       bool
	}{
		{"valid correction", "Tanggal sebenarnya 12 Oktober.", org, true},
		{"blank", "  ", org, false}, {"too long", strings.Repeat("a", 2001), org, false},
		{"read only other unit", "Koreksi catatan", other, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			store := &noteStoreStub{}
			service := NewNoteService(store, noteEventStub{&entity.RiskEvent{ID: eventID, OrganizationID: org}})
			_, err := service.Add(context.Background(), &entity.AccessScope{UserID: actor, OrganizationID: &tt.home, AccessibleOrgIDs: []uuid.UUID{org}}, eventID, tt.body, uuid.New())
			if (err == nil) != tt.want {
				t.Fatalf("unexpected error %v", err)
			}
			if !tt.want && store.created != 0 {
				t.Fatal("invalid note persisted")
			}
		})
	}
}
