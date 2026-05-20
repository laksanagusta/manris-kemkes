package risk

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type reviewScheduleRiskRepo struct {
	created         *entity.Risk
	updated         *entity.Risk
	byID            *entity.Risk
	activatedRiskID uuid.UUID
	activateCount   int
}

type reviewScheduleTaskRepo struct {
	created []*entity.MitigationTask
}

func (r *reviewScheduleTaskRepo) Create(_ context.Context, task *entity.MitigationTask) error {
	copyTask := *task
	r.created = append(r.created, &copyTask)
	return nil
}
func (r *reviewScheduleTaskRepo) GetByID(context.Context, uuid.UUID, []uuid.UUID) (*entity.MitigationTask, error) {
	return nil, nil
}
func (r *reviewScheduleTaskRepo) Update(context.Context, *entity.MitigationTask) error { return nil }
func (r *reviewScheduleTaskRepo) ListByRisk(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (r *reviewScheduleTaskRepo) ListByMitigation(context.Context, uuid.UUID, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (r *reviewScheduleTaskRepo) ListByUser(context.Context, uuid.UUID, string, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (r *reviewScheduleTaskRepo) ListPendingOverdue(context.Context, time.Time) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (r *reviewScheduleTaskRepo) GetRecurringMitigations(context.Context) ([]*entity.Mitigation, error) {
	return nil, nil
}
func (r *reviewScheduleTaskRepo) ListAll(context.Context, []uuid.UUID) ([]*entity.MitigationTask, error) {
	return nil, nil
}
func (r *reviewScheduleTaskRepo) ListAllPaginated(context.Context, []uuid.UUID, int, int) ([]*entity.MitigationTask, int, error) {
	return nil, 0, nil
}
func (r *reviewScheduleTaskRepo) TaskExistsForPeriod(context.Context, uuid.UUID, string, string) (bool, error) {
	return false, nil
}

func (r *reviewScheduleRiskRepo) Create(_ context.Context, risk *entity.Risk) error {
	r.created = cloneReviewScheduleRisk(risk)
	return nil
}

func (r *reviewScheduleRiskRepo) GetByID(_ context.Context, _ uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	return cloneReviewScheduleRisk(r.byID), nil
}

func (r *reviewScheduleRiskRepo) Update(_ context.Context, risk *entity.Risk) error {
	for i := range risk.Mitigations {
		if risk.Mitigations[i].ID == uuid.Nil {
			risk.Mitigations[i].ID = uuid.New()
		}
		if risk.Mitigations[i].RiskID == uuid.Nil {
			risk.Mitigations[i].RiskID = risk.ID
		}
	}
	r.updated = cloneReviewScheduleRisk(risk)
	r.byID = cloneReviewScheduleRisk(risk)
	return nil
}

func (r *reviewScheduleRiskRepo) Delete(context.Context, uuid.UUID) error { return nil }

func (r *reviewScheduleRiskRepo) List(context.Context, []uuid.UUID, string, string) ([]*entity.Risk, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) ListRegister(context.Context, repository.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, nil
}

func (r *reviewScheduleRiskRepo) ListMitigations(context.Context, []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) NextRiskCode(context.Context) (string, error) { return "R-001", nil }

func (r *reviewScheduleRiskRepo) ListApprovedRisks(context.Context, []uuid.UUID, string) ([]*entity.Risk, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) DashboardSummary(context.Context, string, []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) DashboardCategoryCounts(context.Context, string, []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) HeatmapData(context.Context, string, []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (r *reviewScheduleRiskRepo) HeatmapMultiPhase(context.Context, int, []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) TopRisks(context.Context, string, int, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) ListVersions(context.Context, uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) ListCycleSnapshot(context.Context, string, []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) ActivateApprovedVersion(context.Context, uuid.UUID) error {
	r.activateCount++
	r.activatedRiskID = r.byID.ID
	return nil
}

func (r *reviewScheduleRiskRepo) ListReviewQueue(context.Context, string, []uuid.UUID, string, string, int, int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
}

func (r *reviewScheduleRiskRepo) CompareCycles(context.Context, string, string, []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) RiskReviewSummary(context.Context, string, []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) GetHeatmapVelocity(context.Context, string, string, []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) GetOverdueMitigationTimeline(context.Context, []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) GetKRIBreachSummary(context.Context, []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}

func (r *reviewScheduleRiskRepo) GetUnitResponseTime(context.Context, []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

type reviewScheduleUserRepo struct{}

func (r *reviewScheduleUserRepo) Create(context.Context, *entity.User) error { return nil }
func (r *reviewScheduleUserRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.User, error) {
	return &entity.User{ID: id}, nil
}
func (r *reviewScheduleUserRepo) GetByUsername(context.Context, string) (*entity.User, error) {
	return nil, nil
}
func (r *reviewScheduleUserRepo) GetByNIP(context.Context, string) (*entity.User, error) {
	return nil, nil
}
func (r *reviewScheduleUserRepo) Update(context.Context, *entity.User) error { return nil }
func (r *reviewScheduleUserRepo) Delete(context.Context, uuid.UUID) error    { return nil }
func (r *reviewScheduleUserRepo) List(context.Context) ([]*entity.User, error) {
	return nil, nil
}
func (r *reviewScheduleUserRepo) ListWithFilter(context.Context, repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

type reviewScheduleOrgRepo struct{}

func (r *reviewScheduleOrgRepo) Create(context.Context, *entity.Organization) error { return nil }
func (r *reviewScheduleOrgRepo) GetByID(_ context.Context, id uuid.UUID) (*entity.Organization, error) {
	return &entity.Organization{ID: id}, nil
}
func (r *reviewScheduleOrgRepo) Update(context.Context, *entity.Organization) error { return nil }
func (r *reviewScheduleOrgRepo) Delete(context.Context, uuid.UUID) error            { return nil }
func (r *reviewScheduleOrgRepo) List(context.Context) ([]*entity.Organization, error) {
	return nil, nil
}
func (r *reviewScheduleOrgRepo) ListWithFilter(context.Context, repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (r *reviewScheduleOrgRepo) GetDescendants(context.Context, uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}
func (r *reviewScheduleOrgRepo) GetContext(context.Context, uuid.UUID) (string, error) {
	return "", nil
}

func TestCreateRiskUseCase_ExecutePersistsReviewScheduleText(t *testing.T) {
	reviewScheduleText := "Setiap akhir semester"
	nextReviewDate := "2026-06-30"
	createdBy := uuid.New()
	roID := uuid.New()
	repo := &reviewScheduleRiskRepo{}
	uc := NewCreateRiskUseCase(repo, &reviewScheduleUserRepo{}, &reviewScheduleOrgRepo{})

	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:              "Risk review cadence",
		Category:           entity.RiskCategoryKebijakan,
		CreatedBy:          &createdBy,
		ROID:               &roID,
		Probability:        3,
		Impact:             4,
		TargetProbability:  2,
		TargetImpact:       3,
		NextReviewDate:     &nextReviewDate,
		ReviewScheduleText: reviewScheduleText,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if repo.created == nil {
		t.Fatal("expected risk to be created")
	}
	if repo.created.ReviewScheduleText != reviewScheduleText {
		t.Fatalf("expected review schedule text %q, got %q", reviewScheduleText, repo.created.ReviewScheduleText)
	}
	if repo.created.NextReviewDate == nil || *repo.created.NextReviewDate != nextReviewDate {
		t.Fatalf("expected next review date %q, got %v", nextReviewDate, repo.created.NextReviewDate)
	}
}

func TestUpdateRiskUseCase_ExecutePersistsReviewScheduleText(t *testing.T) {
	riskID := uuid.New()
	organizationID := uuid.New()
	roID := uuid.New()
	existingReviewDate := "2026-03-31"
	updatedReviewDate := "2026-09-30"
	repo := &reviewScheduleRiskRepo{
		byID: &entity.Risk{
			ID:                 riskID,
			Code:               "R-001",
			Title:              "Existing risk",
			Category:           entity.RiskCategoryKebijakan,
			Status:             entity.RiskStatusDraft,
			VersionGroupID:     uuid.New(),
			OrganizationID:     &organizationID,
			Probability:        3,
			Impact:             3,
			NextReviewDate:     &existingReviewDate,
			ReviewScheduleText: "Review bulanan",
		},
	}
	uc := NewUpdateRiskUseCase(repo, &reviewScheduleUserRepo{}, &reviewScheduleOrgRepo{}, nil, &reviewScheduleTaskRepo{})

	_, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:                 riskID,
		Title:              "Updated risk",
		Description:        "Updated desc",
		Category:           entity.RiskCategoryOperasional,
		Status:             entity.RiskStatusDraft,
		OrganizationID:     &organizationID,
		ROID:               &roID,
		Probability:        4,
		Impact:             3,
		NextReviewDate:     &updatedReviewDate,
		ReviewScheduleText: "Review setelah forum triwulan",
	}, nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if repo.updated == nil {
		t.Fatal("expected risk to be updated")
	}
	if repo.updated.ReviewScheduleText != "Review setelah forum triwulan" {
		t.Fatalf("expected updated review schedule text, got %q", repo.updated.ReviewScheduleText)
	}
	if repo.updated.NextReviewDate == nil || *repo.updated.NextReviewDate != updatedReviewDate {
		t.Fatalf("expected next review date %q, got %v", updatedReviewDate, repo.updated.NextReviewDate)
	}
}

func TestUpdateRiskUseCase_ExecuteActivatesApprovedReassessmentVersion(t *testing.T) {
	riskID := uuid.New()
	previousRiskID := uuid.New()
	organizationID := uuid.New()
	roID := uuid.New()
	repo := &reviewScheduleRiskRepo{
		byID: &entity.Risk{
			ID:             riskID,
			PreviousRiskID: &previousRiskID,
			Code:           "R-001",
			Title:          "Existing reassessment",
			Category:       entity.RiskCategoryKebijakan,
			Status:         entity.RiskStatusDraft,
			VersionGroupID: uuid.New(),
			OrganizationID: &organizationID,
			Probability:    3,
			Impact:         3,
		},
	}
	uc := NewUpdateRiskUseCase(repo, &reviewScheduleUserRepo{}, &reviewScheduleOrgRepo{}, nil, &reviewScheduleTaskRepo{})

	_, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:             riskID,
		Title:          "Finalized reassessment",
		Description:    "Updated desc",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusApproved,
		OrganizationID: &organizationID,
		ROID:           &roID,
		Probability:    4,
		Impact:         3,
	}, nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if repo.updated == nil {
		t.Fatal("expected risk to be updated before activation")
	}
	if repo.activateCount != 1 {
		t.Fatalf("expected ActivateApprovedVersion to be called once, got %d", repo.activateCount)
	}
	if repo.activatedRiskID != riskID {
		t.Fatalf("expected ActivateApprovedVersion risk %s, got %s", riskID, repo.activatedRiskID)
	}
}

func TestUpdateRiskUseCase_ExecuteApprovedRiskCreatesMitigationTask(t *testing.T) {
	riskID := uuid.New()
	organizationID := uuid.New()
	dueDate := "2026-06-10"
	roID := uuid.New()
	repo := &reviewScheduleRiskRepo{
		byID: &entity.Risk{
			ID:             riskID,
			Code:           "R-001",
			Title:          "Existing risk",
			Category:       entity.RiskCategoryKebijakan,
			Status:         entity.RiskStatusDraft,
			VersionGroupID: uuid.New(),
			OrganizationID: &organizationID,
			Probability:    3,
			Impact:         3,
			Mitigations: []entity.Mitigation{
				{ID: uuid.New(), RiskID: riskID, Action: "Mitigasi A", Owner: "PIC A", DueDate: &dueDate},
			},
		},
	}
	taskRepo := &reviewScheduleTaskRepo{}
	uc := NewUpdateRiskUseCase(repo, &reviewScheduleUserRepo{}, &reviewScheduleOrgRepo{}, nil, taskRepo)

	_, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:             riskID,
		Title:          "Finalized risk",
		Description:    "Updated desc",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusApproved,
		OrganizationID: &organizationID,
		ROID:           &roID,
		Probability:    4,
		Impact:         3,
		Mitigations: []entity.Mitigation{
			{Action: "Mitigasi A", Owner: "PIC A", DueDate: &dueDate},
		},
	}, nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(taskRepo.created) != 1 {
		t.Fatalf("expected 1 mitigation task, got %d", len(taskRepo.created))
	}
}

func cloneReviewScheduleRisk(risk *entity.Risk) *entity.Risk {
	if risk == nil {
		return nil
	}
	copy := *risk
	copy.Cause = append([]string(nil), risk.Cause...)
	copy.ImpactDesc = append([]string(nil), risk.ImpactDesc...)
	copy.Mitigations = append([]entity.Mitigation(nil), risk.Mitigations...)
	copy.DraftApprovalLine = append([]entity.ApprovalLineMember(nil), risk.DraftApprovalLine...)
	return &copy
}
