package riskcharter

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type workflowRiskCharterRepo struct {
	item     *entity.RiskCharter
	existing *entity.RiskCharter
	deleted  uuid.UUID
	versions []*entity.RiskCharter
}

func (r *workflowRiskCharterRepo) Create(context.Context, *entity.RiskCharter) error { return nil }
func (r *workflowRiskCharterRepo) GetByID(context.Context, uuid.UUID) (*entity.RiskCharter, error) {
	return r.item, nil
}
func (r *workflowRiskCharterRepo) UpdateDraft(context.Context, *entity.RiskCharter) error {
	return nil
}
func (r *workflowRiskCharterRepo) List(context.Context, repository.RiskCharterListFilter) ([]*entity.RiskCharter, int, error) {
	return nil, 0, nil
}
func (r *workflowRiskCharterRepo) FindExistingByOrgLevel(context.Context, uuid.UUID, string) (*entity.RiskCharter, error) {
	return r.existing, nil
}
func (r *workflowRiskCharterRepo) Finalize(_ context.Context, charter *entity.RiskCharter) error {
	charter.Status = entity.RiskCharterStatusActive
	charter.IsCurrent = true
	return nil
}
func (r *workflowRiskCharterRepo) CreateRevision(_ context.Context, _ *entity.RiskCharter, revision *entity.RiskCharter) error {
	revision.ID = uuid.New()
	return nil
}
func (r *workflowRiskCharterRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.RiskCharter, error) {
	if r.versions != nil {
		return r.versions, nil
	}
	return []*entity.RiskCharter{r.item}, nil
}
func (r *workflowRiskCharterRepo) Archive(context.Context, uuid.UUID) error { return nil }
func (r *workflowRiskCharterRepo) Restore(context.Context, *entity.RiskCharter) error {
	return nil
}
func (r *workflowRiskCharterRepo) DeleteDraft(_ context.Context, id uuid.UUID) error {
	r.deleted = id
	return nil
}

func completeDraft(orgID, actorID uuid.UUID) *entity.RiskCharter {
	return &entity.RiskCharter{
		ID:             uuid.New(),
		Title:          "Piagam Tahunan",
		OrganizationID: orgID,
		UPRLevel:       "upr_t1",
		Period:         "2026",
		Scope:          "Seluruh proses unit",
		LegalBases: []entity.RiskCharterLegalBasis{
			{ID: "legal-1", Reference: "KMK 2026"},
		},
		InternalContext: "Kapasitas internal",
		ExternalContext: "Lingkungan eksternal",
		Stakeholders: []entity.RiskCharterStakeholder{
			{ID: "stakeholder-1", Name: "Mitra", Relationship: "Koordinasi"},
		},
		UPRStructure: []entity.RiskCharterUPRMember{
			{ID: "chair", Role: entity.RiskCharterRoleChair, Name: "Ketua", Position: "Direktur"},
			{ID: "secretary", Role: entity.RiskCharterRoleSecretary, Name: "Sekretaris", Position: "Kabag"},
			{ID: "member", Role: entity.RiskCharterRoleMember, Name: "Anggota", Position: "Analis"},
			{ID: "supervisor", Role: entity.RiskCharterRoleSupervisor, Name: "Pengawas", Position: "Inspektur"},
		},
		Status:         entity.RiskCharterStatusDraft,
		VersionGroupID: uuid.New(),
		VersionNumber:  1,
		IsCurrent:      true,
		CreatedBy:      &actorID,
	}
}

func TestWorkflowFinalizeCompleteDraft(t *testing.T) {
	orgID := uuid.New()
	actorID := uuid.New()
	repo := &workflowRiskCharterRepo{item: completeDraft(orgID, actorID)}
	uc := NewWorkflowUseCase(repo)

	result, err := uc.Finalize(context.Background(), CharterActionInput{
		ID: repo.item.ID, Actor: actorID, Scope: &entity.AccessScope{OrganizationID: &orgID},
	})
	if err != nil {
		t.Fatalf("Finalize() error = %v", err)
	}
	if result.Status != entity.RiskCharterStatusActive || result.FinalizedBy == nil {
		t.Fatalf("Finalize() result = %#v", result)
	}
}

func TestWorkflowSuperadminCannotWriteAnotherOrganization(t *testing.T) {
	charterOrgID := uuid.New()
	actorOrgID := uuid.New()
	actorID := uuid.New()
	repo := &workflowRiskCharterRepo{item: completeDraft(charterOrgID, actorID)}
	uc := NewWorkflowUseCase(repo)

	_, err := uc.Finalize(context.Background(), CharterActionInput{
		ID:    repo.item.ID,
		Actor: actorID,
		Scope: &entity.AccessScope{
			OrganizationID: &actorOrgID,
			Role:           entity.RoleSuperAdmin,
			IsGlobal:       true,
		},
	})
	if err == nil {
		t.Fatal("Finalize() expected organization-scope error")
	}
}

func TestWorkflowCreateRevisionClonesActiveVersion(t *testing.T) {
	orgID := uuid.New()
	actorID := uuid.New()
	active := completeDraft(orgID, actorID)
	active.Status = entity.RiskCharterStatusActive
	repo := &workflowRiskCharterRepo{item: active}
	uc := NewWorkflowUseCase(repo)

	result, err := uc.CreateRevision(context.Background(), CreateRevisionInput{
		CharterActionInput: CharterActionInput{
			ID: active.ID, Actor: actorID, Scope: &entity.AccessScope{OrganizationID: &orgID},
		},
		Reason: "Penyesuaian mandat tahunan",
	})
	if err != nil {
		t.Fatalf("CreateRevision() error = %v", err)
	}
	if result.Existing || result.Charter.Status != entity.RiskCharterStatusDraft {
		t.Fatalf("CreateRevision() result = %#v", result)
	}
	if result.Charter.VersionNumber != active.VersionNumber+1 || result.Charter.IsCurrent {
		t.Fatalf("revision version metadata = %#v", result.Charter)
	}
}

func TestCreateCharterReusesExistingAcrossYears(t *testing.T) {
	orgID, actorID := uuid.New(), uuid.New()
	existing := completeDraft(orgID, actorID)
	existing.Period = "2025"
	repo := &workflowRiskCharterRepo{existing: existing}
	output, err := NewCreateRiskCharterUseCase(repo).Execute(t.Context(), CreateRiskCharterInput{
		Title: "Piagam unit", OrganizationID: orgID, UPRLevel: "upr_t1", CreatedBy: actorID,
		Scope: &entity.AccessScope{OrganizationID: &orgID},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !output.Existing || output.Charter.ID != existing.ID {
		t.Fatal("created an annual duplicate instead of reusing charter")
	}
}

func TestCreateCharterStartsVersionOneWithoutYear(t *testing.T) {
	orgID, actorID := uuid.New(), uuid.New()
	output, err := NewCreateRiskCharterUseCase(&workflowRiskCharterRepo{}).Execute(t.Context(), CreateRiskCharterInput{
		Title: "Piagam unit", OrganizationID: orgID, UPRLevel: "upr_t1", Period: "2030", CreatedBy: actorID,
		Scope: &entity.AccessScope{OrganizationID: &orgID},
	})
	if err != nil {
		t.Fatal(err)
	}
	if output.Existing || output.Charter.Period != "" || output.Charter.VersionNumber != 1 {
		t.Fatalf("annual identity remains: %+v", output)
	}
}

func TestRevisionContinuesMergedVersionSequence(t *testing.T) {
	org, actor := uuid.New(), uuid.New()
	source := completeDraft(org, actor)
	source.Status = entity.RiskCharterStatusActive
	repo := &workflowRiskCharterRepo{item: source, versions: []*entity.RiskCharter{source, {VersionNumber: 8}}}
	result, err := NewWorkflowUseCase(repo).CreateRevision(t.Context(), CreateRevisionInput{
		CharterActionInput: CharterActionInput{ID: source.ID, Actor: actor, Scope: &entity.AccessScope{OrganizationID: &org}},
		Reason:             "Perubahan konteks organisasi",
	})
	if err != nil {
		t.Fatal(err)
	}
	if result.Charter.VersionNumber != 9 || result.Charter.IsCurrent || source.Status != entity.RiskCharterStatusActive {
		t.Fatalf("invalid revision sequence or active version: %+v", result.Charter)
	}
}
