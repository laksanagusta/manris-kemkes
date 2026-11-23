package risk

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
)

type ownerTestUsers struct {
	categoryUserRepo
	owner entity.User
}

func (r *ownerTestUsers) GetByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	if id == r.owner.ID {
		return &r.owner, nil
	}
	return r.categoryUserRepo.GetByID(ctx, id)
}

func TestCreateRiskWithOwnerAndCombinedSource(t *testing.T) {
	org, otherOrg, owner, actor := uuid.New(), uuid.New(), uuid.New(), uuid.New()
	users := &ownerTestUsers{owner: entity.User{ID: owner, OrganizationID: &org, Status: entity.UserStatusActive}}
	requestedOwner := owner.String()

	for _, tc := range []struct {
		name string
		org  uuid.UUID
		want error
	}{
		{name: "owning unit", org: org},
		{name: "another unit", org: otherOrg, want: domainerrors.ErrRiskOwnerInvalid},
	} {
		t.Run(tc.name, func(t *testing.T) {
			riskRepo := &categoryRiskRepo{}
			useCase := NewCreateRiskUseCase(riskRepo, users, &categoryOrgRepo{})
			_, err := useCase.Execute(context.Background(), CreateRiskInput{
				Title: "Risiko distribusi", Category: entity.RiskCategoryOperasional,
				OrganizationID: &tc.org, CreatedBy: &actor, RiskOwnerID: &requestedOwner,
				RiskSource: "External & Internal",
			})
			if !errors.Is(err, tc.want) {
				t.Fatalf("got %v, want %v", err, tc.want)
			}
			if tc.want != nil {
				if riskRepo.created != nil {
					t.Fatal("invalid owner was persisted")
				}
				return
			}
			if riskRepo.created == nil || !uuidPtrEqual(riskRepo.created.RiskOwnerID, &owner) || riskRepo.created.RiskSource != "internal_eksternal" {
				t.Fatalf("owner or combined source missing from saved risk: %+v", riskRepo.created)
			}
		})
	}
}

func TestUpdateRiskPreservesOrClearsOwner(t *testing.T) {
	org, owner, riskID := uuid.New(), uuid.New(), uuid.New()
	blank := ""
	for _, tc := range []struct {
		name      string
		requested *string
		want      *uuid.UUID
	}{
		{name: "omitted retains owner", want: &owner},
		{name: "empty clears owner", requested: &blank},
	} {
		t.Run(tc.name, func(t *testing.T) {
			riskRepo := &categoryRiskRepo{byID: &entity.Risk{
				ID: riskID, Code: "R-001", Title: "Risiko distribusi", Category: entity.RiskCategoryOperasional,
				Status: entity.RiskStatusDraft, OrganizationID: &org, RiskOwnerID: &owner,
				Probability: 3, Impact: 3, RiskSource: "internal_eksternal",
			}}
			useCase := NewUpdateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{}, nil, nil)
			_, err := useCase.Execute(context.Background(), UpdateRiskInput{
				ID: riskID, Title: "Risiko distribusi", Category: entity.RiskCategoryOperasional,
				Status: entity.RiskStatusDraft, OrganizationID: &org, RiskOwnerID: tc.requested,
				Probability: 3, Impact: 3, RiskSource: "internal_eksternal",
			}, []uuid.UUID{org})
			if err != nil {
				t.Fatal(err)
			}
			if riskRepo.updated == nil || !uuidPtrEqual(riskRepo.updated.RiskOwnerID, tc.want) || riskRepo.updated.RiskSource != "internal_eksternal" {
				t.Fatalf("unexpected saved risk: %+v", riskRepo.updated)
			}
		})
	}
}
