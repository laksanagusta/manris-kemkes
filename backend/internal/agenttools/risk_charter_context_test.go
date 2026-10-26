package agenttools

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type charterContextRepository struct {
	repository.RiskCharterRepository
	items  []*entity.RiskCharter
	total  int
	calls  int
	filter repository.RiskCharterListFilter
}

func (r *charterContextRepository) List(_ context.Context, filter repository.RiskCharterListFilter) ([]*entity.RiskCharter, int, error) {
	r.calls++
	r.filter = filter
	return r.items, r.total, nil
}
func TestRiskCharterDraftContextUsesOnlyActiveOwnAnnualBusinessContext(t *testing.T) {
	org := uuid.New()
	scope := &entity.AccessScope{OrganizationID: &org, AccessibleOrgIDs: []uuid.UUID{org}, Role: entity.RoleUnit}
	active := &entity.RiskCharter{ID: uuid.New(), Title: "Piagam 2026", OrganizationID: org, Period: "2026", Status: "active", IsCurrent: true, Scope: "Pengawasan pintu masuk", InternalContext: "Kapasitas pemeriksaan terbatas", ExternalContext: "Mobilitas meningkat", LegalBases: []entity.RiskCharterLegalBasis{{Reference: "Regulasi uji", Provision: "Kewajiban pengawasan"}}, Stakeholders: []entity.RiskCharterStakeholder{{Name: "Instansi pelabuhan", Relationship: "Koordinasi pemeriksaan"}}, UPRStructure: []entity.RiskCharterUPRMember{{Name: "PRIVATE_PERSON_MARKER"}}}
	repo := &charterContextRepository{items: []*entity.RiskCharter{active,
		{ID: uuid.New(), OrganizationID: org, Period: "2026", Status: "draft", IsCurrent: true, Scope: "DRAFT_MARKER"},
		{ID: uuid.New(), OrganizationID: org, Period: "2026", Status: "archived", IsCurrent: true, Scope: "ARCHIVE_MARKER"},
		{ID: uuid.New(), OrganizationID: org, Period: "2025", Status: "active", IsCurrent: true, Scope: "OLD_YEAR_MARKER"},
		{ID: uuid.New(), OrganizationID: org, Period: "2026", Status: "superseded", IsCurrent: false, Scope: "OLD_VERSION_MARKER"},
	}, total: 5}
	result, err := loadRiskCharterDraftContext(t.Context(), repo, scope, "2026")
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(result)
	text := string(raw)
	for _, marker := range []string{active.ID.String(), active.Scope, active.InternalContext, active.ExternalContext, "Regulasi uji", "Instansi pelabuhan", "/management/charters/"} {
		if !strings.Contains(text, marker) {
			t.Errorf("charter context missing %s", marker)
		}
	}
	for _, marker := range []string{"PRIVATE_PERSON_MARKER", "DRAFT_MARKER", "ARCHIVE_MARKER", "OLD_YEAR_MARKER", "OLD_VERSION_MARKER", "uprStructure", "createdBy"} {
		if strings.Contains(text, marker) {
			t.Errorf("irrelevant or ineligible charter data exposed: %s", marker)
		}
	}
	if repo.filter.OrganizationID == nil || *repo.filter.OrganizationID != org || repo.filter.Period != "2026" {
		t.Fatal("context not restricted to home org/year", repo.filter)
	}
}
func TestRiskCharterDraftContextPreservesHomeOrganizationAccess(t *testing.T) {
	org, other := uuid.New(), uuid.New()
	repo := &charterContextRepository{items: []*entity.RiskCharter{{OrganizationID: other, Period: "2026", Status: "active", IsCurrent: true}}, total: 1}
	_, err := loadRiskCharterDraftContext(t.Context(), repo, &entity.AccessScope{OrganizationID: &org, IsGlobal: true}, "2026")
	if !errors.Is(err, domainerrors.ErrForbidden) {
		t.Fatal("foreign charter context accepted", err)
	}
}
func TestRiskCharterDraftContextReportsMissingAndOversizedContext(t *testing.T) {
	org := uuid.New()
	scope := &entity.AccessScope{OrganizationID: &org}
	for _, tt := range []struct {
		name  string
		items []*entity.RiskCharter
		want  string
	}{
		{name: "missing", want: "unavailable"},
		{name: "oversized", want: "too_large", items: []*entity.RiskCharter{{OrganizationID: org, Period: "2026", Status: "active", IsCurrent: true, Scope: strings.Repeat("x", 20000)}}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			result, err := loadRiskCharterDraftContext(t.Context(), &charterContextRepository{items: tt.items, total: len(tt.items)}, scope, "2026")
			if err != nil {
				t.Fatal(err)
			}
			if result.Status != tt.want || len(result.Charters) != 0 || result.Warning == "" {
				t.Fatalf("missing/oversized context misrepresented: %+v", result)
			}
		})
	}
}
