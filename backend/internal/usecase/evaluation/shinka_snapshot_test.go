package evaluation

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type shinkaOrganizationFixture struct{ org *entity.Organization }

func (f shinkaOrganizationFixture) GetByID(context.Context, uuid.UUID) (*entity.Organization, error) {
	return f.org, nil
}

type shinkaRiskFixture struct {
	org   uuid.UUID
	risks []*entity.Risk
	calls int
}

func (f *shinkaRiskFixture) ListCycleSnapshot(_ context.Context, period string, ids []uuid.UUID) ([]*entity.Risk, error) {
	f.calls++
	if period != "2026-Q4" || len(ids) != 1 || ids[0] != f.org {
		panic("snapshot must be organization-period scoped")
	}
	return f.risks, nil
}
func TestShinkaSnapshotBuildsScopedVersionedEvidence(t *testing.T) {
	orgID := uuid.New()
	risks := &shinkaRiskFixture{org: orgID, risks: []*entity.Risk{{ID: uuid.New(), OrganizationID: &orgID, Title: "A risk", Code: "R-1", Probability: 2, Impact: 2, Nilai: 4}}}
	uc := NewSnapshotUseCase(shinkaOrganizationFixture{&entity.Organization{ID: orgID, Name: "Unit"}}, risks)
	first, err := uc.Execute(t.Context(), orgID, "2026-Q4")
	if err != nil {
		t.Fatal(err)
	}
	second, err := uc.Execute(t.Context(), orgID, "2026-Q4")
	if err != nil {
		t.Fatal(err)
	}
	if first.SchemaVersion != 1 || first.Data.RiskCount != 1 || len(first.Data.Risks) != 1 || first.SourceVersion == "" || first.SourceVersion != second.SourceVersion {
		t.Fatal("invalid evidence snapshot")
	}
	if _, err := uc.Execute(t.Context(), orgID, "invalid"); err == nil {
		t.Fatal("invalid period accepted")
	}
	other := uuid.New()
	risks.risks[0].OrganizationID = &other
	if _, err := uc.Execute(t.Context(), orgID, "2026-Q4"); err == nil {
		t.Fatal("cross-organization source leak")
	}
}
