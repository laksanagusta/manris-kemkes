package risk

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestInitialRiskFinalizationUsesJakartaQuarter(t *testing.T) {
	for _, tt := range []struct {
		name string
		at   string
		want string
		day  string
	}{
		{"quarter boundary", "2027-03-31T17:00:00Z", "2027-Q2", "2027-04-01"},
		{"year boundary", "2027-12-31T17:00:00Z", "2028-Q1", "2028-01-01"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			now, err := time.Parse(time.RFC3339, tt.at)
			if err != nil {
				t.Fatal(err)
			}
			creator := uuid.New()
			createdRepo := &categoryRiskRepo{}
			create := NewCreateRiskUseCase(createdRepo, &categoryUserRepo{}, &categoryOrgRepo{})
			create.now = func() time.Time { return now }
			_, err = create.Execute(context.Background(), CreateRiskInput{
				Title: "Risiko baru", Category: entity.RiskCategoryOperasional,
				Status: entity.RiskStatusFinal, CreatedBy: &creator,
				AssessmentCycle: "2027-Q1", Probability: 2, Impact: 2,
			})
			if err != nil {
				t.Fatal(err)
			}
			if got := createdRepo.created.AssessmentCycle; got != tt.want {
				t.Fatalf("create cycle = %s, want %s", got, tt.want)
			}
			if got := createdRepo.created.EffectiveFrom.Format("2006-01-02"); got != tt.day {
				t.Fatalf("create effective date = %s, want %s", got, tt.day)
			}

			for _, revision := range []bool{false, true} {
				risk := &entity.Risk{ID: uuid.New(), Code: "R-001", Title: "Risiko lama", Category: entity.RiskCategoryOperasional,
					Status: entity.RiskStatusDraft, VersionGroupID: uuid.New(), VersionNumber: 1,
					AssessmentCycle: "2027-Q1", Probability: 2, Impact: 2}
				if revision {
					id := uuid.New()
					risk.PreviousRiskID = &id
					risk.VersionNumber = 2
				}
				repo := &categoryRiskRepo{byID: risk}
				update := NewUpdateRiskUseCase(repo, &categoryUserRepo{}, &categoryOrgRepo{}, nil, nil)
				update.now = func() time.Time { return now }
				_, err := update.Execute(context.Background(), UpdateRiskInput{
					ID: risk.ID, Title: risk.Title, Category: risk.Category, Status: entity.RiskStatusFinal,
					Probability: 2, Impact: 2, AssessmentCycle: "2027-Q1", ChangeReason: "Peninjauan kondisi terbaru",
				}, nil)
				if err != nil {
					t.Fatal(err)
				}
				want := tt.want
				if revision {
					want = "2027-Q1"
				}
				if repo.updated.AssessmentCycle != want {
					t.Fatalf("revision=%v cycle=%s, want %s", revision, repo.updated.AssessmentCycle, want)
				}
				if !revision && repo.updated.EffectiveFrom.Format("2006-01-02") != tt.day {
					t.Fatal("draft finalization must preserve the Jakarta calendar date")
				}
			}
		})
	}
}

func TestCreateRiskPreservesUnassessedDraftAndRejectsUnassessedFinal(t *testing.T) {
	creator := uuid.New()
	for _, tt := range []struct {
		name, status        string
		probability, impact int
		valid               bool
	}{
		{"unassessed draft", entity.RiskStatusDraft, 0, 0, true},
		{"unassessed final", entity.RiskStatusFinal, 0, 0, false},
		{"partial draft", entity.RiskStatusDraft, 0, 3, false},
		{"existing scored draft", entity.RiskStatusDraft, 3, 3, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			repo := &categoryRiskRepo{}
			uc := NewCreateRiskUseCase(repo, &categoryUserRepo{}, &categoryOrgRepo{})
			_, err := uc.Execute(context.Background(), CreateRiskInput{Title: "Risiko", Category: entity.RiskCategoryOperasional,
				CreatedBy: &creator, Status: tt.status, Probability: tt.probability, Impact: tt.impact})
			if (err == nil) != tt.valid {
				t.Fatalf("error=%v, want valid=%v", err, tt.valid)
			}
			if tt.valid && (repo.created.Probability != tt.probability || repo.created.Impact != tt.impact) {
				t.Fatal("saved scores changed")
			}
		})
	}
}
