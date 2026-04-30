package risk

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	domainrepo "github.com/manris/backend/internal/domain/repository"
)

type objectiveValidationRepo struct {
	objective *entity.RiskObjective
}

func (r *objectiveValidationRepo) Create(context.Context, *entity.RiskObjective) error { return nil }
func (r *objectiveValidationRepo) GetByID(context.Context, uuid.UUID) (*entity.RiskObjective, error) {
	if r.objective == nil {
		return nil, domainerrors.ErrNotFound
	}
	return r.objective, nil
}
func (r *objectiveValidationRepo) Update(context.Context, *entity.RiskObjective) error { return nil }
func (r *objectiveValidationRepo) Delete(context.Context, uuid.UUID) error              { return nil }
func (r *objectiveValidationRepo) List(context.Context, domainrepo.RiskObjectiveListFilter) ([]*entity.RiskObjective, int, error) {
	return nil, 0, nil
}

func TestCreateRisk_RequiresObjectiveWhenKMKFlagEnabled(t *testing.T) {
	creatorID := uuid.New()
	riskRepo := &categoryRiskRepo{}
	objectiveRepo := &objectiveValidationRepo{}
	uc := NewCreateRiskUseCase(
		riskRepo,
		&categoryUserRepo{},
		&categoryOrgRepo{},
		WithRiskObjectiveValidation(objectiveRepo, true),
	)

	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:             "Risiko uji",
		Description:       "Deskripsi risiko uji yang valid untuk kebutuhan pengujian",
		Category:          entity.RiskCategoryOperasional,
		CreatedBy:         &creatorID,
		Probability:       3,
		Impact:            3,
		TargetProbability: 2,
		TargetImpact:      2,
	})
	if err == nil {
		t.Fatal("expected error when objective is missing")
	}
}

func TestCreateRisk_RejectsObjectiveFromDifferentOrganization(t *testing.T) {
	creatorID := uuid.New()
	orgID := uuid.New()
	otherOrgID := uuid.New()
	objectiveID := uuid.New()
	riskRepo := &categoryRiskRepo{}
	objectiveRepo := &objectiveValidationRepo{
		objective: &entity.RiskObjective{ID: objectiveID, OrganizationID: otherOrgID},
	}
	uc := NewCreateRiskUseCase(
		riskRepo,
		&categoryUserRepo{},
		&categoryOrgRepo{},
		WithRiskObjectiveValidation(objectiveRepo, false),
	)

	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:             "Risiko uji",
		Description:       "Deskripsi risiko uji yang valid untuk kebutuhan pengujian",
		Category:          entity.RiskCategoryOperasional,
		CreatedBy:         &creatorID,
		OrganizationID:    &orgID,
		ObjectiveID:       &objectiveID,
		Probability:       3,
		Impact:            3,
		TargetProbability: 2,
		TargetImpact:      2,
	})
	if err == nil {
		t.Fatal("expected error when objective belongs to another organization")
	}
}
